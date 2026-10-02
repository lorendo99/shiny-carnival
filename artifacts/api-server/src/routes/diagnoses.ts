import { randomUUID } from "node:crypto";
import { getAuth } from "@clerk/express";
import { Router, type IRouter, type RequestHandler } from "express";
import {
  CreateDiagnosisBody,
  CreateDiagnosisResponse,
  ExtractApplianceLabelBody,
  ExtractApplianceLabelResponse,
  AskDiagnosisAssistantBody,
  AskDiagnosisAssistantResponse,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, fixMateDiagnoses, householdInventoryItems } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { saveDiagnosis } from "../lib/diagnosisRepository";
import { analyseMedia } from "../lib/mediaAnalysis";
import {
  allowRequest,
  claimMediaJob,
  releaseMediaJob,
} from "../lib/requestLimits";

const router: IRouter = Router();

function getErrorStatus(error: unknown): number {
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : 500;
}

function isTemporaryProviderError(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function withProviderRetry<T>(
  request: () => Promise<T>,
  onRetry: (error: unknown, attempt: number) => void,
): Promise<T> {
  const delays = [750, 1_500];
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      if (!isTemporaryProviderError(error) || attempt >= delays.length) {
        throw error;
      }
      onRetry(error, attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}

function providerErrorMessage(status: number, fallback: string): string {
  if (status === 429) {
    return "FixMate is receiving a lot of requests. Please wait a few seconds and try again.";
  }
  if (status === 502 || status === 503 || status === 504) {
    return "FixMate's diagnosis service is temporarily unavailable. Please try again shortly.";
  }
  return fallback;
}

const requireAuth: RequestHandler = (req, res, next) => {
  if (!getAuth(req).userId) {
    res.status(401).json({ error: "Sign in to request a diagnosis." });
    return;
  }
  next();
};

type CoverageAnswer = "yes" | "no" | "unsure";
type CoverageAnswers = {
  manufacturerWarranty: CoverageAnswer;
  appliancePlan: CoverageAnswer;
  homeInsurance: CoverageAnswer;
  recentlyRepaired: CoverageAnswer;
};

const defaultCoverageAnswers: CoverageAnswers = {
  manufacturerWarranty: "unsure",
  appliancePlan: "unsure",
  homeInsurance: "unsure",
  recentlyRepaired: "unsure",
};

function normalizeCoverageAnswers(value: unknown): CoverageAnswers {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const answer = (key: keyof CoverageAnswers): CoverageAnswer =>
    source[key] === "yes" || source[key] === "no" || source[key] === "unsure"
      ? source[key]
      : "unsure";
  return {
    manufacturerWarranty: answer("manufacturerWarranty"),
    appliancePlan: answer("appliancePlan"),
    homeInsurance: answer("homeInsurance"),
    recentlyRepaired: answer("recentlyRepaired"),
  };
}

function coverageGuidance(answers: CoverageAnswers) {
  if (answers.recentlyRepaired === "yes") {
    return {
      route: "recent_repair" as const,
      heading: "Contact the original repairer first",
      nextSteps: [
        "Find the original invoice, repair date, and any workmanship guarantee.",
        "Describe the same or related fault and ask the repairer to review it under their guarantee.",
        "Do not authorise a new paid repair until the original repairer or guarantee provider has responded.",
      ],
    };
  }
  if (answers.manufacturerWarranty === "yes") {
    return {
      route: "manufacturer_warranty" as const,
      heading: "Check the manufacturer warranty before paying for a repair",
      nextSteps: [
        "Find the purchase receipt, model number, serial number, and warranty terms.",
        "Contact the manufacturer or authorised service route and ask whether this fault is covered.",
        "Avoid opening the appliance or booking paid work if doing so could affect the warranty.",
      ],
    };
  }
  if (answers.appliancePlan === "yes") {
    return {
      route: "appliance_plan" as const,
      heading: "Use your appliance plan provider first",
      nextSteps: [
        "Check the plan documents and note the claim or service number.",
        "Contact the plan provider before arranging an independent repair.",
        "Ask about call-out fees, excesses, exclusions, and whether DIY work affects cover.",
      ],
    };
  }
  if (answers.homeInsurance === "yes") {
    return {
      route: "home_insurance" as const,
      heading: "Check home insurance before paying for a repair",
      nextSteps: [
        "Review whether the damage and cause are covered, including any excess.",
        "Contact your insurer before disposing of parts, authorising work, or making permanent changes.",
        "Keep photos, receipts, and the diagnosis details for the claim.",
      ],
    };
  }
  if (Object.values(answers).some((answer) => answer === "unsure")) {
    return {
      route: "check_coverage" as const,
      heading: "Confirm your cover before arranging paid repair work",
      nextSteps: [
        "Check the warranty, appliance plan, insurance policy, or recent repair invoice.",
        "Ask the relevant provider whether this fault and any call-out cost are covered.",
        "Only compare paid repair options after those routes have been checked.",
      ],
    };
  }
  return {
    route: "paid_repair" as const,
    heading: "No cover was indicated — compare repair options carefully",
    nextSteps: [
      "Keep the diagnosis, parts estimate, and safety note for any repairer.",
      "Ask for a written quote and confirm the call-out fee before booking.",
      "Use a qualified professional where the diagnosis marks the repair as professional-only.",
    ],
  };
}

router.get("/diagnoses", requireAuth, async (req, res) => {
  try {
    const rows = await db
      .select({ result: fixMateDiagnoses.result })
      .from(fixMateDiagnoses)
      .where(eq(fixMateDiagnoses.userId, getAuth(req).userId!))
      .orderBy(desc(fixMateDiagnoses.createdAt))
      .limit(20);
    res.json(rows.map(({ result }) => {
      const saved = result as Record<string, unknown>;
      const savedCoverage = normalizeCoverageAnswers(saved.coverageAnswers);
      return CreateDiagnosisResponse.parse({
        ...saved,
        audioEvidence: Array.isArray(saved.audioEvidence) ? saved.audioEvidence : [],
        errorCodeSafeChecks: Array.isArray(saved.errorCodeSafeChecks) ? saved.errorCodeSafeChecks : [],
        errorCodeCommonParts: Array.isArray(saved.errorCodeCommonParts) ? saved.errorCodeCommonParts : [],
        partsNeeded: Array.isArray(saved.partsNeeded) ? saved.partsNeeded : [],
        requiredTools: Array.isArray(saved.requiredTools) ? saved.requiredTools : [],
        professionalParts: Array.isArray(saved.professionalParts) ? saved.professionalParts : [],
        diySuitability: saved.diySuitability === "yes" || saved.diySuitability === "with_caution" || saved.diySuitability === "no"
          ? saved.diySuitability
          : "with_caution",
        coverageAnswers: savedCoverage,
        coverageGuidance: saved.coverageGuidance && typeof saved.coverageGuidance === "object"
          ? saved.coverageGuidance
          : coverageGuidance(savedCoverage),
      });
    }));
  } catch (error) {
    req.log.error({ err: error }, "Unable to load diagnosis history");
    res.status(500).json({ error: "Your saved diagnoses could not be loaded." });
  }
});

router.post("/appliance-label", requireAuth, async (req, res) => {
  if (!allowRequest(req, "label-extraction", 12)) {
    res.status(429).json({
      error: "Too many label scans were requested. Try again in a moment.",
    });
    return;
  }

  const parsed = ExtractApplianceLabelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Attach a clear appliance label photo to scan." });
    return;
  }
  if (!parsed.data.media.contentType.startsWith("image/")) {
    res.status(415).json({ error: "Label scanning needs a photo rather than a video." });
    return;
  }
  if (!claimMediaJob()) {
    res.status(429).json({
      error: "FixMate is already inspecting other media. Try again in a moment.",
    });
    return;
  }

  try {
    const analysed = await analyseMedia(parsed.data.media, getAuth(req).userId!);
    const response = await withProviderRetry(
      () => openai.chat.completions.create({
        model: "gpt-5.6-luna",
        max_completion_tokens: 2048,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You extract appliance label details from one photo. Return only JSON with a details object containing exactly these keys: " +
              "brand, modelNumber, serialNumber, productType, approximateAge. Use null when a value is missing, too blurry, or not clearly printed. " +
              "Copy characters carefully and do not guess. approximateAge may be a concise estimate such as 'about 8 years' only when the label has a manufacture date, " +
              "date code, or another reliable clue. Never treat unrelated numbers such as ratings, barcodes, or part numbers as the serial number.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Read the appliance identification label in this photo." },
              {
                type: "image_url",
                image_url: { url: analysed.images[0]!, detail: "high" },
              },
            ],
          },
        ],
      }, { timeout: 45_000 }),
      (error, attempt) => req.log.warn({ err: error, attempt }, "Retrying appliance label provider request"),
    );
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("The label extraction service returned an empty response.");
    const extracted = ExtractApplianceLabelResponse.parse(JSON.parse(content));
    res.json(extracted);
  } catch (error) {
    req.log.error({ err: error }, "Unable to extract appliance label");
    const status = getErrorStatus(error);
    res.status(status).json({
      error: providerErrorMessage(
        status,
        "FixMate could not read that label. Try a sharper, well-lit photo.",
      ),
    });
  } finally {
    releaseMediaJob();
  }
});

router.post("/diagnoses", requireAuth, async (req, res) => {
  if (!allowRequest(req, "diagnosis", 20)) {
    res.status(429).json({
      error: "Too many diagnoses were requested. Wait a little before trying again.",
    });
    return;
  }
  const parsed = CreateDiagnosisBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Tell us what is broken and what it is doing." });
    return;
  }

  const { itemType, symptom, media, applianceDetails, errorCode, inventoryItemId } = parsed.data;
  const coverageAnswers = normalizeCoverageAnswers(parsed.data.coverageAnswers);
  if (inventoryItemId) {
    const [item] = await db.select({ id: householdInventoryItems.id }).from(householdInventoryItems).where(and(
      eq(householdInventoryItems.id, inventoryItemId),
      eq(householdInventoryItems.userId, getAuth(req).userId!),
    )).limit(1);
    if (!item) {
      res.status(404).json({ error: "That household item could not be found." });
      return;
    }
  }
  if (media && !claimMediaJob()) {
    res.status(429).json({
      error: "FixMate is already inspecting other media. Try again in a moment.",
    });
    return;
  }

  try {
    const userId = getAuth(req).userId!;
    const analysed = media ? await analyseMedia(media, userId) : null;
    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string; detail: "low" } }
      | { type: "input_audio"; input_audio: { data: string; format: "wav" } }
    > = [
      {
        type: "text",
        text: JSON.stringify({
          itemType,
          symptom,
          applianceDetails: applianceDetails ?? null,
          errorCode: errorCode ?? null,
          coverageAnswers,
          mediaKind: analysed?.kind ?? null,
          audioTranscript: analysed?.transcript ?? null,
          audioEvidence: analysed?.audioEvidence ?? [],
        }),
      },
      ...(analysed?.images.map((url) => ({
        type: "image_url" as const,
        image_url: { url, detail: "low" as const },
      })) ?? []),
    ];
    if (analysed?.audioData && analysed.audioFormat === "wav") {
      userContent.push({
        type: "input_audio",
        input_audio: { data: analysed.audioData, format: "wav" },
      });
    }
    const systemMessage =
      "You are FixMate, a cautious UK repair triage assistant. Return only JSON. " +
      "Give one most likely fault plus 2 or 3 other plausible causes, a calibrated confidence from 45 to 92, realistic UK repair and parts price ranges in GBP, " +
      "difficulty as Easy, Medium, or Hard, 3 concise next steps, and the evidence that would distinguish the causes. " +
      "Never instruct the user to open gas appliances, boilers, mains electrical equipment, pressurised systems, or anything involving fire, fumes, burning smells, exposed wires, or flooding. " +
      "For those cases set safetyLevel to professional and tell the user to isolate power, gas, or water only if it is safe and accessible. " +
             "Do not claim certainty. The JSON keys must be: headline, likelyProblem, otherPossibleCauses, distinguishingEvidence, professionalInspection, confidence, " +
             "repairCostMin, repairCostMax, partsCostMin, partsCostMax, difficulty, safetyLevel, safetyNote, nextSteps, mediaEvidence, audioEvidence, " +
             "partsNeeded, requiredTools, diySuitability, professionalParts, " +
      "errorCode, errorCodeMeaning, errorCodeSafeChecks, errorCodeResetAdvice, errorCodeProfessionalNeeded, errorCodeCommonParts. " +
      "otherPossibleCauses and distinguishingEvidence must be arrays of concise strings. professionalInspection must explain when an in-person inspection is required, " +
      "or say that a professional inspection is not currently required while making clear this is an estimate. safetyLevel must be safe, caution, or professional. " +
      "mediaEvidence must be an array of short, plain statements naming only visible frame details or transcript/audio clues that materially affected the result. " +
      "audioEvidence must contain only the measured recording observations supplied in the request, or be empty when there is no audio. Treat sound as supporting evidence, never as a definitive diagnosis. " +
      "If an error code is supplied or clearly readable in a photo, explain its likely meaning, safe user-level checks, cautious reset guidance, when a professional is needed, and common parts that may be involved. " +
      "If there is no reliable error code, use null for errorCode, errorCodeMeaning, errorCodeResetAdvice, and errorCodeProfessionalNeeded, and empty arrays for errorCodeSafeChecks and errorCodeCommonParts. " +
              "Never invent a code or model-specific reset sequence. If no media was supplied, or it added no useful evidence, return an empty mediaEvidence array. Never infer a dangerous condition from an unclear image. " +
              "partsNeeded and requiredTools must be concise, practical lists. partsCostMin and partsCostMax are approximate GBP parts-only costs, not retailer links. " +
              "diySuitability must be yes, with_caution, or no. Use no for gas, mains electrical, fire, flooding, pressurised, structural, or otherwise hazardous work. " +
              "professionalParts must list parts that should only be selected or fitted by a qualified professional; use an empty array when none are identified. Do not provide retailer links or affiliate recommendations.";
    const requestDiagnosis = (content: typeof userContent) => withProviderRetry(
      () => openai.chat.completions.create({
        model: "gpt-5.6-luna",
        max_completion_tokens: 8192,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content },
        ],
      }, { timeout: 45_000 }),
      (error, attempt) => req.log.warn({ err: error, attempt }, "Retrying diagnosis provider request"),
    );
    let response;
    try {
      response = await requestDiagnosis(userContent);
    } catch (error) {
      if (!analysed?.audioData || ![400, 415, 422].includes(getErrorStatus(error))) throw error;
      req.log.warn({ err: error }, "Audio input was not accepted by the diagnosis model; retrying with measured audio evidence");
      response = await requestDiagnosis(userContent.filter((part) => part.type !== "input_audio"));
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("The diagnosis service returned an empty response.");
    }

    const aiDiagnosis = JSON.parse(content) as Record<string, unknown>;
    const safetyLevel = aiDiagnosis.safetyLevel === "professional" || aiDiagnosis.safetyLevel === "caution" || aiDiagnosis.safetyLevel === "safe"
      ? aiDiagnosis.safetyLevel
      : "caution";
    const diagnosis = CreateDiagnosisResponse.parse({
      id: randomUUID(),
      itemType,
      ...aiDiagnosis,
      applianceDetails: applianceDetails ?? undefined,
      errorCode:
        typeof aiDiagnosis.errorCode === "string"
          ? aiDiagnosis.errorCode
          : errorCode ?? null,
      otherPossibleCauses: Array.isArray(aiDiagnosis.otherPossibleCauses) ? aiDiagnosis.otherPossibleCauses : [],
      distinguishingEvidence: Array.isArray(aiDiagnosis.distinguishingEvidence) ? aiDiagnosis.distinguishingEvidence : [],
      audioEvidence: analysed?.audioEvidence ?? [],
      errorCodeSafeChecks: Array.isArray(aiDiagnosis.errorCodeSafeChecks) ? aiDiagnosis.errorCodeSafeChecks : [],
      errorCodeCommonParts: Array.isArray(aiDiagnosis.errorCodeCommonParts) ? aiDiagnosis.errorCodeCommonParts : [],
      errorCodeMeaning: typeof aiDiagnosis.errorCodeMeaning === "string" ? aiDiagnosis.errorCodeMeaning : null,
      errorCodeResetAdvice: typeof aiDiagnosis.errorCodeResetAdvice === "string" ? aiDiagnosis.errorCodeResetAdvice : null,
      errorCodeProfessionalNeeded:
        typeof aiDiagnosis.errorCodeProfessionalNeeded === "string" ? aiDiagnosis.errorCodeProfessionalNeeded : null,
      partsNeeded: Array.isArray(aiDiagnosis.partsNeeded) ? aiDiagnosis.partsNeeded : [],
      requiredTools: Array.isArray(aiDiagnosis.requiredTools) ? aiDiagnosis.requiredTools : [],
      diySuitability:
        safetyLevel === "professional"
          ? "no"
          : aiDiagnosis.diySuitability === "yes" || aiDiagnosis.diySuitability === "with_caution" || aiDiagnosis.diySuitability === "no"
            ? aiDiagnosis.diySuitability
            : "with_caution",
      professionalParts: Array.isArray(aiDiagnosis.professionalParts) ? aiDiagnosis.professionalParts : [],
      coverageAnswers,
      coverageGuidance: coverageGuidance(coverageAnswers),
      professionalInspection:
        typeof aiDiagnosis.professionalInspection === "string"
          ? aiDiagnosis.professionalInspection
          : "This is an estimate based on the information provided. Arrange a professional inspection if the fault persists, worsens, or involves a safety risk.",
      generatedAt: new Date().toISOString(),
      mediaAnalysed: Boolean(analysed),
    });

    await saveDiagnosis({
      diagnosis,
      userId,
      inventoryItemId,
      symptom,
      mediaName: media?.name ?? null,
    });
    res.json(diagnosis);
  } catch (error) {
    req.log.error({ err: error }, "Unable to generate diagnosis");
    const status = getErrorStatus(error);
    res.status(status).json({
      error: providerErrorMessage(
        status,
        "FixMate could not complete that diagnosis. Please try again.",
      ),
    });
  } finally {
    if (media) releaseMediaJob();
  }
});

router.post("/diagnoses/:diagnosisId/assistant", requireAuth, async (req, res): Promise<void> => {
  if (!allowRequest(req, "diagnosis-assistant", 20)) {
    res.status(429).json({ error: "Too many assistant requests. Try again later." });
    return;
  }
  const parsed = AskDiagnosisAssistantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ask a question between 2 and 500 characters." });
    return;
  }
  try {
    const userId = getAuth(req).userId!;
    const [saved] = await db.select({
      itemType: fixMateDiagnoses.itemType,
      symptom: fixMateDiagnoses.symptom,
      result: fixMateDiagnoses.result,
    }).from(fixMateDiagnoses).where(and(
      eq(fixMateDiagnoses.id, String(req.params.diagnosisId)),
      eq(fixMateDiagnoses.userId, userId),
    )).limit(1);
    if (!saved) {
      res.status(404).json({ error: "That diagnosis could not be found." });
      return;
    }
    const messages = [
      {
        role: "system" as const,
        content: `You are FixMate Expert, a private follow-up assistant for one repair diagnosis.
Answer only questions about this repair and the saved evidence below. Ask a clarifying question when evidence is weak. Never claim certainty.
Never provide instructions involving gas, mains electricity, fire, flooding, boilers, pressurised systems, exposed wires, fumes, or other dangerous work; direct urgent hazards to qualified professionals and emergency services when appropriate.
Return only JSON with keys answer (string) and safetyLevel (safe, caution, or professional).
Repair item: ${saved.itemType}
Original symptom: ${saved.symptom}
Saved diagnosis result: ${JSON.stringify(saved.result)}`,
      },
      ...(parsed.data.history ?? []).map((turn) => ({ role: turn.role, content: turn.content })),
      { role: "user" as const, content: parsed.data.question },
    ];
    const completion = await withProviderRetry(
      () => openai.chat.completions.create({
        model: "gpt-5.6-luna",
        max_completion_tokens: 8192,
        response_format: { type: "json_object" },
        messages,
      }, { timeout: 45_000 }),
      (error, attempt) => req.log.warn({ err: error, attempt }, "Retrying diagnosis assistant provider request"),
    );
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Empty assistant response");
    const answer = AskDiagnosisAssistantResponse.parse(JSON.parse(content));
    res.json(answer);
  } catch (error) {
    req.log.error({ err: error }, "Diagnosis assistant unavailable");
    const status = getErrorStatus(error);
    if (isTemporaryProviderError(error)) {
      res.status(status).json({
        error: providerErrorMessage(
          status,
          "FixMate Expert is temporarily unavailable. Please try again.",
        ),
      });
      return;
    }
    if (error instanceof SyntaxError || (typeof error === "object" && error !== null && "issues" in error)) {
      res.status(502).json({ error: "FixMate Expert returned an invalid response. Please try again." });
      return;
    }
    res.status(502).json({ error: "FixMate Expert is temporarily unavailable. Please try again." });
  }
});

export default router;