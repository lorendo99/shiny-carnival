import { randomUUID } from "node:crypto";
import { getAuth } from "@clerk/express";
import { Router, type IRouter, type RequestHandler } from "express";
import {
  AcceptRepairQuoteParams,
  AcceptRepairQuoteResponse,
  CreateRepairJobBody,
  CreateRepairJobResponse,
  CreateRepairQuoteBody,
  CreateRepairQuoteParams,
  CreateRepairQuoteResponse,
  CreateRepairPriceOfferParams,
  CreateRepairPriceOfferBody,
  CreateRepairPriceOfferResponse,
  AgreeRepairPriceOfferParams,
  AgreeRepairPriceOfferResponse,
  DeclineRepairPriceOfferParams,
  DeclineRepairPriceOfferResponse,
  ConfirmRepairPaymentBody,
  ConfirmRepairPaymentResponse,
  ConfirmRepairQuotePaymentParams,
  ConfirmRepairQuotePaymentResponse,
  CreateEngineerPayoutOnboardingResponse,
  GetEngineerProfileResponse,
  ListRepairJobsQueryParams,
  ListRepairJobsResponse,
  ListPublicRepairJobsResponse,
  ListRepairQuotesParams,
  ListRepairQuotesResponse,
  RegisterEngineerBody,
  RegisterEngineerResponse,
  RejectRepairQuoteParams,
  RejectRepairQuoteResponse,
  ListJobResponsesParams,
  ListJobResponsesResponse,
  UpdateJobResponseParams,
  UpdateJobResponseBody,
  UpdateJobResponseResponse,
  ListJobMessagesParams,
  ListJobMessagesResponse,
  SendJobMessageParams,
  SendJobMessageBody,
  SendJobMessageResponse,
  CancelRepairPaymentParams,
  CancelRepairPaymentResponse,
  UpdateRepairJobTimelineParams,
  UpdateRepairJobTimelineBody,
  UpdateRepairJobTimelineResponse,
  CreateRepairReminderParams,
  CreateRepairReminderBody,
  CreateRepairReminderResponse,
  UpdateRepairReminderParams,
  UpdateRepairReminderBody,
  UpdateRepairReminderResponse,
  ListMarketplaceReportsQueryParams,
  ListMarketplaceReportsResponse,
  UpdateMarketplaceReportParams,
  UpdateMarketplaceReportBody,
  UpdateMarketplaceReportResponse,
  BlockMarketplaceUserBody,
  BlockMarketplaceUserResponse,
  ListMarketplaceBlocksResponse,
  UnblockMarketplaceUserParams,
  CreateMarketplaceReportBody,
  CreateMarketplaceReportResponse,
} from "@workspace/api-zod";
import {
  db,
  engineerProfiles,
  fixMateDiagnoses,
  fixMateUsers,
  repairJobs,
  repairPriceOffers,
  repairQuotes,
  repairJobResponses,
  repairJobMessages,
  marketplaceReports,
  marketplaceBlocks,
  type RepairReminder,
  type RepairTimelineEvent,
} from "@workspace/db";
import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { getStripeClient } from "../lib/stripeClient";
import {
  applyPaidRepairCheckout,
  calculateMarketplaceSplit,
  createEngineerPayoutOnboardingLink,
  createOrFindEngineerTransfer,
  engineerCanReceivePayout,
  MarketplacePayoutError,
  refreshEngineerPayoutStatus,
} from "../lib/marketplacePayments";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { ALLOWED_MEDIA, IMAGE_LIMIT, verifyUploadToken } from "./storage";
import { Readable } from "node:stream";

const router: IRouter = Router();
const storage = new ObjectStorageService();

const timelineSteps = [
  ["diagnosis_created", "Diagnosis created"],
  ["repairer_contacted", "Repairer contacted"],
  ["quote_received", "Quote received"],
  ["repair_booked", "Repair booked"],
  ["parts_ordered", "Parts ordered"],
  ["repair_completed", "Repair completed"],
  ["follow_up", "Follow-up reminder"],
] as const;

const reminderLabels = {
  clean_filter: "Clean filters",
  check_seals: "Check seals",
  replace_batteries: "Replace batteries",
  boiler_service: "Service the boiler",
  review_repair: "Review the repair",
  custom: "Custom reminder",
} as const;

function setTimelineEvent(
  current: RepairTimelineEvent[] | null | undefined,
  key: RepairTimelineEvent["key"],
  completed: boolean,
  completedAt = new Date().toISOString(),
): RepairTimelineEvent[] {
  return timelineSteps.map(([stepKey, label]) => {
    const existing = current?.find((event) => event.key === stepKey);
    if (stepKey !== key) return existing ?? { key: stepKey, label, completed: false, completedAt: null };
    return {
      key: stepKey,
      label,
      completed,
      completedAt: completed ? (existing?.completedAt ?? completedAt) : null,
    };
  });
}

function timelineForJob(job: typeof repairJobs.$inferSelect): RepairTimelineEvent[] {
  let timeline = setTimelineEvent(job.timeline, "diagnosis_created", Boolean(job.diagnosisId), job.createdAt.toISOString());
  if (job.status === "accepted" || job.status === "completed") {
    timeline = setTimelineEvent(timeline, "repair_booked", true, job.updatedAt.toISOString());
  }
  if (job.status === "completed") {
    timeline = setTimelineEvent(timeline, "repair_completed", true, job.updatedAt.toISOString());
  }
  return timeline;
}

const requireAuth: RequestHandler = (req, res, next) => {
  if (!getAuth(req).userId) {
    res.status(401).json({ error: "Sign in to use the repair marketplace." });
    return;
  }
  next();
};

const contentRules: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /(?:\+?44\s?7\d{3}|\b07\d{3})[\s.-]?\d{3}[\s.-]?\d{3}|\b0\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b|\+\d[\d\s().-]{7,}\d/i,
    message: "For your safety, keep phone numbers and contact details inside FixMate.",
  },
  {
    pattern: /\b(?:whats?app|telegram|paypal|bank transfer|cash only|pay\s+me\s+(?:direct|outside)|outside\s+fixmate|direct payment|send\s+(?:a\s+)?deposit|upfront fee)\b/i,
    message: "For your safety, do not arrange off-platform payments or contact.",
  },
  {
    pattern: /\b(?:idiot|stupid|scammer?|fuck(?:ing)?|shit|bitch|bastard|threat(?:en|ening)?)\b/i,
    message: "Please remove abusive or threatening language.",
  },
];

function contentIssue(values: Array<string | null | undefined>): string | null {
  const text = values.filter(Boolean).join(" ");
  return contentRules.find((rule) => rule.pattern.test(text))?.message ?? null;
}

async function usersAreBlocked(userA: string, userB: string): Promise<boolean> {
  if (userA === userB) return false;
  const [row] = await db
    .select({ blockerId: marketplaceBlocks.blockerId })
    .from(marketplaceBlocks)
    .where(or(
      and(eq(marketplaceBlocks.blockerId, userA), eq(marketplaceBlocks.blockedUserId, userB)),
      and(eq(marketplaceBlocks.blockerId, userB), eq(marketplaceBlocks.blockedUserId, userA)),
    ))
    .limit(1);
  return Boolean(row);
}

function isMarketplaceAdmin(req: Parameters<RequestHandler>[0]): boolean {
  const userId = getAuth(req).userId;
  if (!userId) return false;
  const allowedIds = (process.env.FIXMATE_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const claims = getAuth(req).sessionClaims as { metadata?: { role?: string }; publicMetadata?: { role?: string } } | undefined;
  return allowedIds.includes(userId) || claims?.metadata?.role === "admin" || claims?.publicMetadata?.role === "admin";
}

function reportResult(row: typeof marketplaceReports.$inferSelect) {
  return {
    ...row,
    details: row.details ?? undefined,
    targetUserId: row.targetUserId ?? null,
    reviewedBy: row.reviewedBy ?? null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    resolutionNotes: row.resolutionNotes ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function engineerProfileResponse(profile: typeof engineerProfiles.$inferSelect) {
  return {
    ...profile,
    rating: profile.ratingHundredths / 100,
    completedJobs: profile.completedJobsCount,
  };
}

function postcodeArea(postcode: string): string {
  const compact = postcode.replace(/\s+/g, "").toUpperCase();
  return compact.length > 3 ? compact.slice(0, -3) : "Area hidden";
}

function redactPostcodeText(value: string, postcode: string): string {
  const compact = postcode.replace(/\s+/g, "");
  if (!compact) return value;
  const pattern = compact.split("").map((character) => character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s*");
  return value.replace(new RegExp(pattern, "gi"), "postcode shared after agreement");
}

function containsExactPostcode(value: string, postcode: string): boolean {
  return redactPostcodeText(value, postcode) !== value;
}

function jobResponse(
  job: typeof repairJobs.$inferSelect,
  applianceDetails?: unknown,
  revealExactPostcode = job.status !== "open",
) {
  return {
    ...job,
    title: revealExactPostcode ? job.title : redactPostcodeText(job.title, job.postcode),
    description: revealExactPostcode ? job.description : redactPostcodeText(job.description, job.postcode),
    postcode: revealExactPostcode ? job.postcode : postcodeArea(job.postcode),
    diagnosisId: job.diagnosisId ?? null,
    applianceDetails: applianceDetails ?? undefined,
    acceptedQuoteId: job.acceptedQuoteId ?? null,
    paymentStatus: job.paymentStatus,
    platformCommissionPence: job.platformCommissionPence ?? null,
    engineerPayoutPence: job.engineerPayoutPence ?? null,
    payoutReleasedAt: job.payoutReleasedAt?.toISOString() ?? null,
    photoRefs: job.photoRefs ?? [],
    timeline: timelineForJob(job),
    reminders: (job.reminders ?? []) as RepairReminder[],
    createdAt: job.createdAt.toISOString(),
  };
}

function publicJobResponse(job: typeof repairJobs.$inferSelect) {
  return {
    id: job.id,
    title: redactPostcodeText(job.title, job.postcode),
    itemType: job.itemType,
    category: job.category,
    description: redactPostcodeText(job.description, job.postcode),
    postcode: postcodeArea(job.postcode),
    status: job.status,
    createdAt: job.createdAt.toISOString(),
  };
}

function responseResult(row: typeof repairJobResponses.$inferSelect, engineerName: string) {
  return { ...row, engineerName, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

function messageResult(row: typeof repairJobMessages.$inferSelect, job?: typeof repairJobs.$inferSelect) {
  return {
    ...row,
    body: job?.status === "open" ? redactPostcodeText(row.body, job.postcode) : row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

function priceOfferResult(
  row: typeof repairPriceOffers.$inferSelect,
  engineerId: string,
) {
  return {
    id: row.id,
    quoteId: row.quoteId,
    proposerRole: row.proposerId === engineerId ? "engineer" as const : "customer" as const,
    amountPence: row.amountPence,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

async function quoteResponse(quote: typeof repairQuotes.$inferSelect) {
  const [job] = await db.select({
    status: repairJobs.status,
    postcode: repairJobs.postcode,
    customerId: repairJobs.customerId,
  })
    .from(repairJobs).where(eq(repairJobs.id, quote.jobId)).limit(1);
  let quoteForResponse = quote;
  let offerRows = await db.select().from(repairPriceOffers)
    .where(eq(repairPriceOffers.quoteId, quote.id))
    .orderBy(asc(repairPriceOffers.createdAt), asc(repairPriceOffers.id));
  if (!offerRows.length && job) {
    quoteForResponse = await db.transaction(async (tx) => {
      const [lockedQuote] = await tx.select().from(repairQuotes)
        .where(eq(repairQuotes.id, quote.id)).for("update").limit(1);
      if (!lockedQuote) return quote;
      const [existing] = await tx.select({ id: repairPriceOffers.id })
        .from(repairPriceOffers).where(eq(repairPriceOffers.quoteId, quote.id)).limit(1);
      if (existing) return lockedQuote;
      const alreadyAgreed = lockedQuote.status === "pending_payment" || lockedQuote.status === "accepted";
      await tx.insert(repairPriceOffers).values({
        id: randomUUID(),
        quoteId: lockedQuote.id,
        proposerId: lockedQuote.engineerId,
        agreedById: alreadyAgreed ? job.customerId : null,
        amountPence: lockedQuote.agreedTotalPence ?? lockedQuote.totalPence,
        message: "",
        status: alreadyAgreed ? "accepted" : lockedQuote.status === "rejected" ? "declined" : "pending",
      });
      if (alreadyAgreed && lockedQuote.agreedTotalPence == null) {
        const [updated] = await tx.update(repairQuotes)
          .set({ agreedTotalPence: lockedQuote.totalPence })
          .where(eq(repairQuotes.id, lockedQuote.id))
          .returning();
        return updated ?? { ...lockedQuote, agreedTotalPence: lockedQuote.totalPence };
      }
      return lockedQuote;
    });
    offerRows = await db.select().from(repairPriceOffers)
      .where(eq(repairPriceOffers.quoteId, quote.id))
      .orderBy(asc(repairPriceOffers.createdAt), asc(repairPriceOffers.id));
  }
  const priceOffers = offerRows.map((row) => priceOfferResult(row, quoteForResponse.engineerId));
  const activeOffer = [...offerRows].reverse().find((offer) =>
    offer.status === "pending" || offer.status === "awaiting_proposer",
  );
  const effectiveTotalPence = quoteForResponse.agreedTotalPence ?? activeOffer?.amountPence ?? quoteForResponse.totalPence;
  const [engineer] = await db
    .select({
      displayName: engineerProfiles.displayName,
      ratingHundredths: engineerProfiles.ratingHundredths,
      reviewCount: engineerProfiles.reviewCount,
      completedJobsCount: engineerProfiles.completedJobsCount,
      identityVerified: engineerProfiles.identityVerified,
      businessDetailsVerified: engineerProfiles.businessDetailsVerified,
      insuranceEvidenceProvided: engineerProfiles.insuranceEvidenceProvided,
      qualificationsProvided: engineerProfiles.qualificationsProvided,
    })
    .from(engineerProfiles)
    .where(eq(engineerProfiles.userId, quoteForResponse.engineerId))
    .limit(1);
  return {
    ...quoteForResponse,
    message: job?.status === "open" ? redactPostcodeText(quoteForResponse.message, job.postcode) : quoteForResponse.message,
    agreedTotalPence: quoteForResponse.agreedTotalPence ?? null,
    currentOfferPence: activeOffer?.amountPence ?? null,
    priceOffers,
    ...calculateMarketplaceSplit(effectiveTotalPence),
    engineerName: engineer?.displayName ?? "FixMate engineer",
    engineerRating: (engineer?.ratingHundredths ?? 0) / 100,
    engineerReviewCount: engineer?.reviewCount ?? 0,
    engineerCompletedJobs: engineer?.completedJobsCount ?? 0,
    engineerIdentityVerified: engineer?.identityVerified ?? false,
    engineerBusinessDetailsVerified: engineer?.businessDetailsVerified ?? false,
    engineerInsuranceEvidenceProvided: engineer?.insuranceEvidenceProvided ?? false,
    engineerQualificationsProvided: engineer?.qualificationsProvided ?? false,
    createdAt: quote.createdAt.toISOString(),
  };
}

async function createCheckoutForAgreedQuote(quoteId: string, customerId: string, origin: string): Promise<string> {
  const [row] = await db.select({ quote: repairQuotes, job: repairJobs })
    .from(repairQuotes)
    .innerJoin(repairJobs, eq(repairJobs.id, repairQuotes.jobId))
    .where(and(eq(repairQuotes.id, quoteId), eq(repairJobs.customerId, customerId)))
    .limit(1);
  if (
    !row ||
    row.job.status !== "pending_payment" ||
    row.job.acceptedQuoteId !== row.quote.id ||
    row.quote.status !== "pending_payment" ||
    !row.quote.agreedTotalPence ||
    !row.job.stripeConnectedAccountId
  ) {
    throw new Error("CHECKOUT_NOT_READY");
  }
  const split = calculateMarketplaceSplit(row.quote.agreedTotalPence);
  if (
    row.job.platformCommissionPence !== split.platformCommissionPence ||
    row.job.engineerPayoutPence !== split.engineerPayoutPence
  ) {
    throw new Error("CHECKOUT_AMOUNT_MISMATCH");
  }

  const stripe = await getStripeClient();
  if (row.quote.stripeCheckoutSessionId) {
    const existing = await stripe.checkout.sessions.retrieve(row.quote.stripeCheckoutSessionId);
    if (existing.payment_status === "paid" || existing.status === "complete") {
      throw new Error("CHECKOUT_ALREADY_COMPLETE");
    }
    if (existing.status === "open" && existing.url && existing.amount_total === row.quote.agreedTotalPence) {
      return existing.url;
    }
    await db.update(repairQuotes)
      .set({ stripeCheckoutSessionId: null, stripePriceId: null })
      .where(and(eq(repairQuotes.id, row.quote.id), eq(repairQuotes.status, "pending_payment")));
  }

  const [quote] = await db.select().from(repairQuotes)
    .where(and(eq(repairQuotes.id, row.quote.id), eq(repairQuotes.status, "pending_payment")))
    .limit(1);
  if (!quote?.agreedTotalPence) throw new Error("CHECKOUT_NOT_READY");
  const base = origin.replace(/\/+$/, "");
  const metadata = {
    jobId: row.job.id,
    quoteId: row.quote.id,
    engineerId: row.quote.engineerId,
    customerId,
  };
  const checkout = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "gbp",
          unit_amount: quote.agreedTotalPence,
          product_data: {
            name: `FixMate repair: ${row.job.title}`,
            metadata: { jobId: row.job.id, quoteId: row.quote.id },
          },
        },
        quantity: 1,
      }],
      success_url: `${base}/marketplace?repair_payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/marketplace?repair_payment=cancelled&quote_id=${row.quote.id}`,
      metadata,
      payment_intent_data: {
        transfer_group: `FIXMATE_REPAIR_${row.job.id}`,
        metadata,
      },
    },
    { idempotencyKey: `fixmate_repair_checkout_${quote.id}_${quote.updatedAt.getTime()}` },
  );
  if (!checkout.url) throw new Error("STRIPE_CHECKOUT_URL_MISSING");
  const [attached] = await db.update(repairQuotes)
    .set({ stripeCheckoutSessionId: checkout.id, stripePriceId: null })
    .where(and(eq(repairQuotes.id, quote.id), eq(repairQuotes.status, "pending_payment")))
    .returning({ id: repairQuotes.id });
  if (!attached) {
    try {
      await stripe.checkout.sessions.expire(checkout.id);
    } catch (error) {
      // The quote was cancelled concurrently; prevent the unused session from remaining payable.
      throw new Error("CHECKOUT_CANCEL_RACE", { cause: error });
    }
    throw new Error("CHECKOUT_CANCEL_RACE");
  }
  return checkout.url;
}

router.get("/marketplace/blocks", requireAuth, async (req, res): Promise<void> => {
  const userId = getAuth(req).userId!;
  const rows = await db.select().from(marketplaceBlocks).where(eq(marketplaceBlocks.blockerId, userId)).orderBy(desc(marketplaceBlocks.createdAt));
  res.json(ListMarketplaceBlocksResponse.parse(rows.map((row) => ({
    blockedUserId: row.blockedUserId,
    createdAt: row.createdAt.toISOString(),
  }))));
});

router.post("/marketplace/blocks", requireAuth, async (req, res): Promise<void> => {
  const body = BlockMarketplaceUserBody.safeParse(req.body);
  const userId = getAuth(req).userId!;
  if (!body.success || body.data.blockedUserId === userId) {
    res.status(400).json({ error: "Choose another marketplace user to block." });
    return;
  }
  const [blockedUser] = await db.select({ userId: engineerProfiles.userId }).from(engineerProfiles).where(eq(engineerProfiles.userId, body.data.blockedUserId)).limit(1);
  const [customer] = await db.select({ id: fixMateUsers.id }).from(fixMateUsers).where(eq(fixMateUsers.id, body.data.blockedUserId)).limit(1);
  if (!blockedUser && !customer) {
    res.status(404).json({ error: "Marketplace user not found." });
    return;
  }
  const [row] = await db.insert(marketplaceBlocks)
    .values({ blockerId: userId, blockedUserId: body.data.blockedUserId })
    .onConflictDoNothing()
    .returning();
  const createdAt = row?.createdAt ?? new Date();
  res.status(201).json(BlockMarketplaceUserResponse.parse({
    blockedUserId: body.data.blockedUserId,
    createdAt: createdAt.toISOString(),
  }));
});

router.delete("/marketplace/blocks/:blockedUserId", requireAuth, async (req, res): Promise<void> => {
  const params = UnblockMarketplaceUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid blocked user." });
    return;
  }
  await db.delete(marketplaceBlocks).where(and(
    eq(marketplaceBlocks.blockerId, getAuth(req).userId!),
    eq(marketplaceBlocks.blockedUserId, params.data.blockedUserId),
  ));
  res.status(204).send();
});

async function reportTarget(reporterId: string, targetType: string, targetId: string): Promise<{ targetUserId: string } | null> {
  if (targetType === "job") {
    const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, targetId)).limit(1);
    if (!job) return null;
    const [relationship] = await db.select({ id: repairJobResponses.id }).from(repairJobResponses).where(and(
      eq(repairJobResponses.jobId, job.id),
      eq(repairJobResponses.engineerId, reporterId),
    )).limit(1);
    const [quote] = await db.select({ id: repairQuotes.id }).from(repairQuotes).where(and(
      eq(repairQuotes.jobId, job.id),
      eq(repairQuotes.engineerId, reporterId),
    )).limit(1);
    return job.customerId === reporterId || relationship || quote ? { targetUserId: job.customerId } : null;
  }

  if (targetType === "quote") {
    const [row] = await db.select({ quote: repairQuotes, customerId: repairJobs.customerId })
      .from(repairQuotes)
      .innerJoin(repairJobs, eq(repairJobs.id, repairQuotes.jobId))
      .where(eq(repairQuotes.id, targetId))
      .limit(1);
    if (!row || (row.customerId !== reporterId && row.quote.engineerId !== reporterId)) return null;
    return { targetUserId: row.quote.engineerId === reporterId ? row.customerId : row.quote.engineerId };
  }

  if (targetType === "message") {
    const [message] = await db.select({ message: repairJobMessages, customerId: repairJobs.customerId })
      .from(repairJobMessages)
      .innerJoin(repairJobs, eq(repairJobs.id, repairJobMessages.jobId))
      .where(eq(repairJobMessages.id, targetId))
      .limit(1);
    if (!message || (message.customerId !== reporterId && message.message.threadEngineerId !== reporterId)) return null;
    const targetUserId = message.message.senderId === reporterId
      ? (message.customerId === reporterId ? message.message.threadEngineerId : message.customerId)
      : message.message.senderId;
    return targetUserId === reporterId ? null : { targetUserId };
  }

  if (targetType === "repairer") {
    const [engineer] = await db.select({ userId: engineerProfiles.userId }).from(engineerProfiles).where(eq(engineerProfiles.userId, targetId)).limit(1);
    if (!engineer || engineer.userId === reporterId) return null;
    const [customerJob] = await db.select({ id: repairJobs.id }).from(repairJobs).where(and(
      eq(repairJobs.customerId, reporterId),
      or(
        sql`${repairJobs.id} IN (SELECT ${repairJobResponses.jobId} FROM ${repairJobResponses} WHERE ${repairJobResponses.engineerId} = ${targetId})`,
        sql`${repairJobs.id} IN (SELECT ${repairQuotes.jobId} FROM ${repairQuotes} WHERE ${repairQuotes.engineerId} = ${targetId})`,
      ),
    )).limit(1);
    if (customerJob) return { targetUserId: targetId };
    return null;
  }
  return null;
}

router.post("/marketplace/reports", requireAuth, async (req, res): Promise<void> => {
  const body = CreateMarketplaceReportBody.safeParse(req.body);
  const reporterId = getAuth(req).userId!;
  if (!body.success) {
    res.status(400).json({ error: "Choose what to report and why." });
    return;
  }
  const target = await reportTarget(reporterId, body.data.targetType, body.data.targetId);
  if (!target) {
    res.status(403).json({ error: "You cannot report this marketplace content." });
    return;
  }
  const [report] = await db.insert(marketplaceReports).values({
    id: randomUUID(),
    reporterId,
    targetType: body.data.targetType,
    targetId: body.data.targetId,
    targetUserId: target.targetUserId,
    reason: body.data.reason,
    details: body.data.details ?? null,
  }).returning();
  res.status(201).json(CreateMarketplaceReportResponse.parse(reportResult(report)));
});

router.get("/marketplace/admin/reports", requireAuth, async (req, res): Promise<void> => {
  if (!isMarketplaceAdmin(req)) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  const query = ListMarketplaceReportsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid moderation queue filter." });
    return;
  }
  const rows = await db.select().from(marketplaceReports)
    .where(eq(marketplaceReports.status, query.data.status))
    .orderBy(desc(marketplaceReports.createdAt))
    .limit(100);
  res.json(ListMarketplaceReportsResponse.parse(rows.map(reportResult)));
});

router.patch("/marketplace/admin/reports/:reportId", requireAuth, async (req, res): Promise<void> => {
  if (!isMarketplaceAdmin(req)) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  const params = UpdateMarketplaceReportParams.safeParse(req.params);
  const body = UpdateMarketplaceReportBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Choose resolved or dismissed." });
    return;
  }
  const [report] = await db.update(marketplaceReports).set({
    status: body.data.status,
    reviewedBy: getAuth(req).userId!,
    reviewedAt: new Date(),
    resolutionNotes: body.data.resolutionNotes ?? null,
  }).where(and(eq(marketplaceReports.id, params.data.reportId), eq(marketplaceReports.status, "open"))).returning();
  if (!report) {
    res.status(404).json({ error: "Report not found or already reviewed." });
    return;
  }
  res.json(UpdateMarketplaceReportResponse.parse(reportResult(report)));
});

router.get("/marketplace/engineers/me", requireAuth, async (req, res): Promise<void> => {
  const [profile] = await db
    .select()
    .from(engineerProfiles)
    .where(eq(engineerProfiles.userId, getAuth(req).userId!))
    .limit(1);
  let payoutsEnabled = profile?.payoutsEnabled ?? false;
  if (profile?.stripeConnectedAccountId) {
    try {
      payoutsEnabled = await refreshEngineerPayoutStatus(profile.userId);
    } catch (error) {
      req.log.warn({ err: error, userId: profile.userId }, "Unable to refresh engineer payout status");
    }
  }
  res.json(GetEngineerProfileResponse.parse(profile ? { ...engineerProfileResponse(profile), payoutsEnabled } : null));
});

router.post("/marketplace/engineers/me", requireAuth, async (req, res): Promise<void> => {
  const parsed = RegisterEngineerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Add your name, postcode, and at least one repair skill." });
    return;
  }
  const userId = getAuth(req).userId!;
  await db.insert(fixMateUsers).values({ id: userId }).onConflictDoNothing();
  const [profile] = await db
    .insert(engineerProfiles)
    .values({ userId, ...parsed.data, postcode: parsed.data.postcode.toUpperCase() })
    .onConflictDoUpdate({
      target: engineerProfiles.userId,
      set: { ...parsed.data, postcode: parsed.data.postcode.toUpperCase(), isActive: true },
    })
    .returning();
  res.json(RegisterEngineerResponse.parse(engineerProfileResponse(profile)));
});

router.post("/marketplace/engineers/me/payout-onboarding", requireAuth, async (req, res): Promise<void> => {
  const userId = getAuth(req).userId!;
  const host = req.get("host");
  if (!host) {
    res.status(400).json({ error: "A secure return address is unavailable." });
    return;
  }
  try {
    const url = await createEngineerPayoutOnboardingLink(userId, `${req.protocol}://${host}`);
    if (!url) {
      res.status(409).json({ error: "Create an active engineer profile before setting up payouts." });
      return;
    }
    res.json(CreateEngineerPayoutOnboardingResponse.parse({ url }));
  } catch (error) {
    req.log.error({ err: error, userId }, "Unable to create Stripe Connect onboarding link");
    res.status(502).json({ error: "Stripe payout setup could not be started. Please try again." });
  }
});

router.get("/marketplace/jobs", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListRepairJobsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid job scope." });
    return;
  }
  const userId = getAuth(req).userId!;
  let jobs: Array<typeof repairJobs.$inferSelect>;
  if (parsed.data.scope === "open") {
    const [engineer] = await db.select().from(engineerProfiles).where(eq(engineerProfiles.userId, userId)).limit(1);
    if (!engineer?.isActive) {
      res.status(403).json({ error: "Register as an engineer before viewing available jobs." });
      return;
    }
    const assignments = await db.select({ id: repairQuotes.id }).from(repairQuotes).where(eq(repairQuotes.engineerId, userId));
    const assignmentIds = assignments.map((row) => row.id);
    jobs = await db
      .select()
      .from(repairJobs)
      .where(
        and(
          ne(repairJobs.customerId, userId),
          or(eq(repairJobs.status, "open"), ...(assignmentIds.length ? [and(inArray(repairJobs.acceptedQuoteId, assignmentIds), inArray(repairJobs.status, ["pending_payment", "accepted"]))] : [])),
        ),
      )
      .orderBy(desc(repairJobs.createdAt))
      .limit(50);
  } else {
    jobs = await db.select().from(repairJobs).where(eq(repairJobs.customerId, userId)).orderBy(desc(repairJobs.createdAt)).limit(50);
  }
  if (parsed.data.scope === "open") {
    const visibleJobs: Array<typeof repairJobs.$inferSelect> = [];
    for (const job of jobs) {
      if (!(await usersAreBlocked(userId, job.customerId))) visibleJobs.push(job);
    }
    jobs = visibleJobs;
  }
  const diagnosisIds = jobs.map((job) => job.diagnosisId).filter((id): id is string => Boolean(id));
  const diagnosisRows = diagnosisIds.length
    ? await db
        .select({ id: fixMateDiagnoses.id, result: fixMateDiagnoses.result })
        .from(fixMateDiagnoses)
        .where(inArray(fixMateDiagnoses.id, diagnosisIds))
    : [];
  const detailsByDiagnosisId = new Map(
    diagnosisRows.map(({ id, result }) => [
      id,
      (result as { applianceDetails?: unknown }).applianceDetails,
    ]),
  );
  res.json(ListRepairJobsResponse.parse(jobs.map((job) =>
    jobResponse(job, detailsByDiagnosisId.get(job.diagnosisId ?? ""), parsed.data.scope === "mine" || job.status !== "open"),
  )));
});

router.get("/marketplace/public-jobs", async (_req, res): Promise<void> => {
  const jobs = await db
    .select()
    .from(repairJobs)
    .where(eq(repairJobs.status, "open"))
    .orderBy(desc(repairJobs.createdAt))
    .limit(50);
  res.json(ListPublicRepairJobsResponse.parse(jobs.map(publicJobResponse)));
});

router.post("/marketplace/jobs", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateRepairJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Add a title, repair details, item type, and postcode." });
    return;
  }
  const userId = getAuth(req).userId!;
  const issue = contentIssue([parsed.data.title, parsed.data.description, parsed.data.itemType]);
  if (issue) {
    res.status(400).json({ error: issue });
    return;
  }
  const photoRefs: string[] = [];
  let applianceDetails: unknown;
  for (const photo of parsed.data.photoRefs ?? []) {
    if (!ALLOWED_MEDIA.has(photo.contentType) || !photo.contentType.startsWith("image/") || photo.size > IMAGE_LIMIT || !photo.objectPath.startsWith("/objects/")) {
      res.status(400).json({ error: "Each job photo must be a valid image upload." }); return;
    }
    const tokenParts = photo.uploadToken.split(".");
    if (tokenParts.length !== 2) { res.status(400).json({ error: "Each job photo upload must be authorized." }); return; }
    const expiresAt = Buffer.from(tokenParts[0], "base64url").toString("utf8");
    if (!verifyUploadToken(photo.objectPath, photo.contentType, photo.size, expiresAt, tokenParts[1], userId)) {
      res.status(400).json({ error: "Each job photo upload must be authorized." }); return;
    }
    photoRefs.push(photo.objectPath);
  }
  if (parsed.data.diagnosisId) {
    const [diagnosis] = await db
      .select({ id: fixMateDiagnoses.id })
      .from(fixMateDiagnoses)
      .where(and(eq(fixMateDiagnoses.id, parsed.data.diagnosisId), eq(fixMateDiagnoses.userId, userId)))
      .limit(1);
    if (!diagnosis) {
      res.status(400).json({ error: "That diagnosis does not belong to your account." });
      return;
    }
    const [diagnosisResult] = await db
      .select({ result: fixMateDiagnoses.result })
      .from(fixMateDiagnoses)
      .where(eq(fixMateDiagnoses.id, parsed.data.diagnosisId))
      .limit(1);
    applianceDetails = (diagnosisResult?.result as { applianceDetails?: unknown } | undefined)?.applianceDetails;
  }
  await db.insert(fixMateUsers).values({ id: userId }).onConflictDoNothing();
  const [job] = await db
    .insert(repairJobs)
    .values({
      id: randomUUID(),
      customerId: userId,
      ...parsed.data,
      diagnosisId: parsed.data.diagnosisId ?? null,
       postcode: parsed.data.postcode.toUpperCase(),
       photoRefs,
    })
    .returning();
  await Promise.all(photoRefs.map((path) => storage.markObjectEntityCommitted(path)));
  res.status(201).json(CreateRepairJobResponse.parse(jobResponse(job, applianceDetails, true)));
});

router.get("/marketplace/jobs/:jobId/responses", requireAuth, async (req, res): Promise<void> => {
  const params = ListJobResponsesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid job." }); return; }
  const userId = getAuth(req).userId!;
  const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, params.data.jobId)).limit(1);
  if (!job) { res.status(404).json({ error: "Job not found." }); return; }
  if (job.customerId !== userId && await usersAreBlocked(userId, job.customerId)) {
    res.status(403).json({ error: "This marketplace participant is blocked." });
    return;
  }
  const rows = await db.select({ response: repairJobResponses, engineerName: engineerProfiles.displayName })
    .from(repairJobResponses).innerJoin(engineerProfiles, eq(engineerProfiles.userId, repairJobResponses.engineerId))
    .where(and(eq(repairJobResponses.jobId, job.id), job.customerId === userId ? eq(repairJobResponses.jobId, job.id) : eq(repairJobResponses.engineerId, userId)));
  const visibleRows = job.customerId === userId
    ? (await Promise.all(rows.map(async (row) => (await usersAreBlocked(userId, row.response.engineerId)) ? null : row))).filter((row): row is (typeof rows)[number] => Boolean(row))
    : rows;
  res.json(ListJobResponsesResponse.parse(visibleRows.map(({ response, engineerName }) => responseResult(response, engineerName))));
});

router.put("/marketplace/jobs/:jobId/responses", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateJobResponseParams.safeParse(req.params);
  const body = UpdateJobResponseBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Choose interested or declined." }); return; }
  const engineerId = getAuth(req).userId!;
  const [engineer] = await db.select().from(engineerProfiles).where(and(eq(engineerProfiles.userId, engineerId), eq(engineerProfiles.isActive, true))).limit(1);
  const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, params.data.jobId)).limit(1);
  if (!engineer || !job || job.customerId === engineerId || job.status !== "open" || await usersAreBlocked(engineerId, job.customerId)) { res.status(409).json({ error: "This job is not available." }); return; }
  const [row] = await db.insert(repairJobResponses).values({ id: randomUUID(), jobId: job.id, engineerId, status: body.data.status })
    .onConflictDoUpdate({ target: [repairJobResponses.jobId, repairJobResponses.engineerId], set: { status: body.data.status } }).returning();
  if (body.data.status === "interested") {
    await db.update(repairJobs)
      .set({ timeline: setTimelineEvent(job.timeline, "repairer_contacted", true) })
      .where(eq(repairJobs.id, job.id));
  }
  res.json(UpdateJobResponseResponse.parse(responseResult(row, engineer.displayName)));
});

router.patch("/marketplace/jobs/:jobId/timeline", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateRepairJobTimelineParams.safeParse(req.params);
  const body = UpdateRepairJobTimelineBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Choose a valid timeline step." });
    return;
  }
  const userId = getAuth(req).userId!;
  const [job] = await db.select().from(repairJobs)
    .where(and(eq(repairJobs.id, params.data.jobId), eq(repairJobs.customerId, userId)))
    .limit(1);
  if (!job) {
    res.status(404).json({ error: "Repair job not found." });
    return;
  }
  if (body.data.step === "repair_completed" && body.data.completed) {
    if (job.status === "completed" && job.paymentStatus === "transferred") {
      res.json(UpdateRepairJobTimelineResponse.parse(jobResponse(job, undefined, true)));
      return;
    }
    if (
      job.status !== "accepted" ||
      !["paid", "transfer_pending"].includes(job.paymentStatus) ||
      !job.acceptedQuoteId
    ) {
      res.status(409).json({ error: "The customer payment must be confirmed before completion can be confirmed." });
      return;
    }
    const [quote] = await db
      .select()
      .from(repairQuotes)
      .where(and(eq(repairQuotes.id, job.acceptedQuoteId), eq(repairQuotes.jobId, job.id), eq(repairQuotes.status, "accepted")))
      .limit(1);
    if (!quote) {
      res.status(409).json({ error: "The accepted repair quote could not be verified." });
      return;
    }
    await db.update(repairJobs)
      .set({ paymentStatus: "transfer_pending" })
      .where(and(eq(repairJobs.id, job.id), eq(repairJobs.status, "accepted"), inArray(repairJobs.paymentStatus, ["paid", "transfer_pending"])));

    try {
      const transfer = await createOrFindEngineerTransfer(job, quote);
      const completedJob = await db.transaction(async (tx) => {
        const [lockedJob] = await tx.select().from(repairJobs).where(eq(repairJobs.id, job.id)).for("update").limit(1);
        if (!lockedJob) return null;
        if (lockedJob.status === "completed" && lockedJob.paymentStatus === "transferred") return lockedJob;
        if (lockedJob.status !== "accepted" || lockedJob.paymentStatus !== "transfer_pending") return null;
        const [updated] = await tx.update(repairJobs)
          .set({
            status: "completed",
            paymentStatus: "transferred",
            stripeTransferId: transfer.id,
            payoutReleasedAt: new Date(),
            timeline: setTimelineEvent(lockedJob.timeline, "repair_completed", true),
          })
          .where(eq(repairJobs.id, lockedJob.id))
          .returning();
        return updated ?? null;
      });
      if (!completedJob) {
        res.status(409).json({ error: "The repair payout changed state. Refresh the job and try again." });
        return;
      }
      res.json(UpdateRepairJobTimelineResponse.parse(jobResponse(completedJob, undefined, true)));
      return;
    } catch (error) {
      if (error instanceof MarketplacePayoutError) {
        res.status(error.code === "PAYOUTS_NOT_ENABLED" ? 409 : 503).json({ error: error.message });
        return;
      }
      req.log.error({ err: error, jobId: job.id }, "Unable to release engineer repair payout");
      res.status(503).json({ error: "The payout could not be released yet. Please try again." });
      return;
    }
  }
  if (
    body.data.step === "repair_completed" &&
    !body.data.completed &&
    (job.status === "completed" || job.paymentStatus === "transferred")
  ) {
    res.status(409).json({ error: "A repair cannot be reopened after the engineer payout has been released." });
    return;
  }
  const [updated] = await db.update(repairJobs)
    .set({
      timeline: setTimelineEvent(job.timeline, body.data.step, body.data.completed),
    })
    .where(eq(repairJobs.id, job.id))
    .returning();
  res.json(UpdateRepairJobTimelineResponse.parse(jobResponse(updated, undefined, true)));
});

router.post("/marketplace/jobs/:jobId/reminders", requireAuth, async (req, res): Promise<void> => {
  const params = CreateRepairReminderParams.safeParse(req.params);
  const body = CreateRepairReminderBody.safeParse(req.body);
  if (!params.success || !body.success || Number.isNaN(body.data.dueAt instanceof Date ? body.data.dueAt.getTime() : Date.parse(body.data.dueAt))) {
    res.status(400).json({ error: "Choose a valid reminder date." });
    return;
  }
  const userId = getAuth(req).userId!;
  const [job] = await db.select().from(repairJobs)
    .where(and(eq(repairJobs.id, params.data.jobId), eq(repairJobs.customerId, userId)))
    .limit(1);
  if (!job) {
    res.status(404).json({ error: "Repair job not found." });
    return;
  }
  const reminder: RepairReminder = {
    id: randomUUID(),
    kind: body.data.kind,
    label: reminderLabels[body.data.kind],
    dueAt: new Date(body.data.dueAt).toISOString(),
    completed: false,
    createdAt: new Date().toISOString(),
  };
  const [updated] = await db.update(repairJobs)
    .set({
      reminders: [...(job.reminders ?? []), reminder],
      timeline: body.data.kind === "review_repair"
        ? setTimelineEvent(job.timeline, "follow_up", true, reminder.dueAt)
        : job.timeline,
    })
    .where(eq(repairJobs.id, job.id))
    .returning();
  res.status(201).json(CreateRepairReminderResponse.parse(jobResponse(updated, undefined, true)));
});

router.patch("/marketplace/jobs/:jobId/reminders/:reminderId", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateRepairReminderParams.safeParse(req.params);
  const body = UpdateRepairReminderBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Choose a valid reminder state." });
    return;
  }
  const userId = getAuth(req).userId!;
  const [job] = await db.select().from(repairJobs)
    .where(and(eq(repairJobs.id, params.data.jobId), eq(repairJobs.customerId, userId)))
    .limit(1);
  if (!job) {
    res.status(404).json({ error: "Repair job not found." });
    return;
  }
  const reminders = (job.reminders ?? []) as RepairReminder[];
  if (!reminders.some((reminder) => reminder.id === params.data.reminderId)) {
    res.status(404).json({ error: "Reminder not found." });
    return;
  }
  const [updated] = await db.update(repairJobs)
    .set({ reminders: reminders.map((reminder) => reminder.id === params.data.reminderId ? { ...reminder, completed: body.data.completed } : reminder) })
    .where(eq(repairJobs.id, job.id))
    .returning();
  res.json(UpdateRepairReminderResponse.parse(jobResponse(updated, undefined, true)));
});

router.get("/marketplace/jobs/:jobId/messages", requireAuth, async (req, res): Promise<void> => {
  const params = ListJobMessagesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid job." }); return; }
  const userId = getAuth(req).userId!;
  const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, params.data.jobId)).limit(1);
  if (!job) { res.status(404).json({ error: "Job not found." }); return; }
  if (job.customerId !== userId && await usersAreBlocked(userId, job.customerId)) {
    res.status(403).json({ error: "This marketplace participant is blocked." });
    return;
  }
  const [participant] = await db.select({ id: repairJobResponses.id }).from(repairJobResponses).where(and(eq(repairJobResponses.jobId, job.id), eq(repairJobResponses.engineerId, userId), eq(repairJobResponses.status, "interested"))).limit(1);
  const [quote] = await db.select({ id: repairQuotes.id }).from(repairQuotes).where(and(eq(repairQuotes.jobId, job.id), eq(repairQuotes.engineerId, userId))).limit(1);
  const canEngineerRead = job.status === "open" ? Boolean(participant || quote) : Boolean(quote && job.acceptedQuoteId === quote.id);
  if (job.customerId !== userId && !canEngineerRead) { res.status(403).json({ error: "You are not a participant in this job." }); return; }
  const [winning] = job.acceptedQuoteId ? await db.select({ engineerId: repairQuotes.engineerId }).from(repairQuotes).where(eq(repairQuotes.id, job.acceptedQuoteId)).limit(1) : [];
  const messages = await db.select().from(repairJobMessages).where(and(
    eq(repairJobMessages.jobId, job.id),
    job.customerId === userId
      ? (job.status === "open" ? eq(repairJobMessages.jobId, job.id) : winning ? eq(repairJobMessages.threadEngineerId, winning.engineerId) : eq(repairJobMessages.threadEngineerId, ""))
      : eq(repairJobMessages.threadEngineerId, userId),
  )).orderBy(repairJobMessages.createdAt);
  res.json(ListJobMessagesResponse.parse(messages.map((message) => messageResult(message, job))));
});

router.post("/marketplace/jobs/:jobId/messages", requireAuth, async (req, res): Promise<void> => {
  const params = SendJobMessageParams.safeParse(req.params);
  const body = SendJobMessageBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Message must be 1-1000 characters." }); return; }
  const userId = getAuth(req).userId!;
  const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, params.data.jobId)).limit(1);
  if (!job) { res.status(404).json({ error: "Job not found." }); return; }
  const [engineer] = await db.select().from(engineerProfiles).where(eq(engineerProfiles.userId, userId)).limit(1);
  const threadEngineerId = body.data.engineerId;
  const [targetEngineer] = await db.select().from(engineerProfiles).where(and(eq(engineerProfiles.userId, threadEngineerId), eq(engineerProfiles.isActive, true))).limit(1);
  if (await usersAreBlocked(userId, threadEngineerId) || (job.customerId !== userId && await usersAreBlocked(userId, job.customerId))) {
    res.status(403).json({ error: "This marketplace participant is blocked." });
    return;
  }
  const [participant] = await db.select({ id: repairJobResponses.id }).from(repairJobResponses).where(and(eq(repairJobResponses.jobId, job.id), eq(repairJobResponses.engineerId, threadEngineerId), eq(repairJobResponses.status, "interested"))).limit(1);
  const [quote] = await db.select({ id: repairQuotes.id }).from(repairQuotes).where(and(eq(repairQuotes.jobId, job.id), eq(repairQuotes.engineerId, threadEngineerId))).limit(1);
  const canTargetThread = job.status === "open"
    ? Boolean(participant || quote)
    : Boolean(quote && job.acceptedQuoteId === quote.id);
  if (job.status === "cancelled" || !targetEngineer || !canTargetThread || (job.customerId !== userId && (threadEngineerId !== userId || !engineer))) { res.status(403).json({ error: "You are not a participant in this job thread." }); return; }
  if (job.status === "open" && containsExactPostcode(body.data.body, job.postcode)) {
    res.status(400).json({ error: "Share the full postcode only after both sides agree on the price." });
    return;
  }
  const issue = contentIssue([body.data.body]);
  if (issue) {
    res.status(400).json({ error: issue });
    return;
  }
  const [message] = await db.insert(repairJobMessages).values({ id: randomUUID(), jobId: job.id, threadEngineerId, senderId: userId, senderRole: job.customerId === userId ? "customer" : "engineer", senderDisplayLabel: job.customerId === userId ? "Customer" : engineer.displayName, body: body.data.body }).returning();
  res.status(201).json(SendJobMessageResponse.parse(messageResult(message, job)));
});

router.get("/marketplace/jobs/:jobId/quotes", requireAuth, async (req, res): Promise<void> => {
  const params = ListRepairQuotesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid job." });
    return;
  }
  const userId = getAuth(req).userId!;
  const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, params.data.jobId)).limit(1);
  if (!job) {
    res.status(404).json({ error: "Job not found." });
    return;
  }
  if (job.customerId !== userId && await usersAreBlocked(userId, job.customerId)) {
    res.status(403).json({ error: "This marketplace participant is blocked." });
    return;
  }
  const [activeEngineer] = await db.select({ isActive: engineerProfiles.isActive }).from(engineerProfiles).where(eq(engineerProfiles.userId, userId)).limit(1);
  const rows = await db
    .select()
    .from(repairQuotes)
    .where(job.customerId === userId || (job.status === "open" && activeEngineer?.isActive)
      ? eq(repairQuotes.jobId, job.id)
      : and(eq(repairQuotes.jobId, job.id), eq(repairQuotes.engineerId, userId)))
    .orderBy(repairQuotes.totalPence);
  const visibleRows = await Promise.all(rows.map(async (quote) => (await usersAreBlocked(userId, quote.engineerId)) ? null : quote));
  res.json(ListRepairQuotesResponse.parse(await Promise.all(visibleRows.filter(Boolean).map(quoteResponse))));
});

router.get("/marketplace/jobs/:jobId/photos/:photoIndex", requireAuth, async (req, res): Promise<void> => {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const index = Number(Array.isArray(req.params.photoIndex) ? req.params.photoIndex[0] : req.params.photoIndex);
  const userId = getAuth(req).userId!;
  const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, jobId)).limit(1);
  if (!job || !Number.isInteger(index) || index < 0 || index >= (job.photoRefs?.length ?? 0)) {
    res.status(404).json({ error: "Photo not found." }); return;
  }
  const [engineer] = await db.select().from(engineerProfiles).where(and(eq(engineerProfiles.userId, userId), eq(engineerProfiles.isActive, true))).limit(1);
  const [quote] = await db.select({ id: repairQuotes.id }).from(repairQuotes).where(and(eq(repairQuotes.jobId, job.id), eq(repairQuotes.engineerId, userId))).limit(1);
  const isWinningEngineer = Boolean(quote && job.acceptedQuoteId === quote.id);
  if (job.customerId !== userId && !(engineer && ((job.status === "open") || isWinningEngineer))) {
    res.status(403).json({ error: "You cannot view this photo." }); return;
  }
  if (job.customerId !== userId && await usersAreBlocked(userId, job.customerId)) {
    res.status(403).json({ error: "This marketplace participant is blocked." }); return;
  }
  try {
    const file = await storage.getObjectEntityFile(job.photoRefs[index]);
    const downloaded = await storage.downloadObject(file);
    downloaded.headers.forEach((value, key) => res.setHeader(key, value));
    if (downloaded.body) Readable.fromWeb(downloaded.body as import("node:stream/web").ReadableStream).pipe(res);
    else res.end();
  } catch (error) {
    if (error instanceof ObjectNotFoundError) { res.status(404).json({ error: "Photo not found." }); return; }
    throw error;
  }
});

router.post("/marketplace/jobs/:jobId/quotes", requireAuth, async (req, res): Promise<void> => {
  const params = CreateRepairQuoteParams.safeParse(req.params);
  const body = CreateRepairQuoteBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Add the message, comparison fields, and all quote costs." });
    return;
  }
  const engineerId = getAuth(req).userId!;
  const [[engineer], [job]] = await Promise.all([
    db.select().from(engineerProfiles).where(eq(engineerProfiles.userId, engineerId)).limit(1),
    db.select().from(repairJobs).where(eq(repairJobs.id, params.data.jobId)).limit(1),
  ]);
  if (!engineer?.isActive) {
    res.status(403).json({ error: "Register as an engineer before quoting." });
    return;
  }
  if (!job || job.status !== "open" || job.customerId === engineerId) {
    res.status(409).json({ error: "This job is not available for quoting." });
    return;
  }
  if (await usersAreBlocked(engineerId, job.customerId)) {
    res.status(403).json({ error: "This marketplace participant is blocked." });
    return;
  }
  if (containsExactPostcode(body.data.message, job.postcode)) {
    res.status(400).json({ error: "Do not share the full postcode before both sides agree on the price." });
    return;
  }
  const issue = contentIssue([
    body.data.message,
    body.data.estimatedDuration,
    body.data.estimatedArrival,
    body.data.warranty,
    body.data.earliestAvailability,
  ]);
  if (issue) {
    res.status(400).json({ error: issue });
    return;
  }
  const subtotalPence = body.data.laborPence + body.data.toolsAndMaterialsPence + body.data.callOutFeePence;
  try {
    const quote = await db.transaction(async (tx) => {
      const [lockedJob] = await tx.select().from(repairJobs).where(eq(repairJobs.id, job.id)).for("update").limit(1);
      if (!lockedJob || lockedJob.status !== "open" || lockedJob.customerId === engineerId) {
        throw new Error("JOB_UNAVAILABLE");
      }
      const [created] = await tx
        .insert(repairQuotes)
        .values({
          id: randomUUID(),
          jobId: lockedJob.id,
          engineerId,
          ...body.data,
          subtotalPence,
          // Engineers submit the final customer-facing price. Premium savings
          // are negotiated into that quote rather than calculated server-side.
          premiumDiscountPence: 0,
          totalPence: subtotalPence,
          status: "negotiating",
        })
        .returning();
      await tx.insert(repairPriceOffers).values({
        id: randomUUID(),
        quoteId: created.id,
        proposerId: engineerId,
        amountPence: created.totalPence,
        message: "",
        status: "pending",
      });
      await tx.insert(repairJobResponses).values({
        id: randomUUID(),
        jobId: lockedJob.id,
        engineerId,
        status: "interested",
      }).onConflictDoUpdate({
        target: [repairJobResponses.jobId, repairJobResponses.engineerId],
        set: { status: "interested" },
      });
      await tx.update(repairJobs)
        .set({ timeline: setTimelineEvent(lockedJob.timeline, "quote_received", true) })
        .where(eq(repairJobs.id, lockedJob.id));
      return created;
    });
    res.status(201).json(CreateRepairQuoteResponse.parse(await quoteResponse(quote)));
  } catch (error) {
    if (error instanceof Error && error.message === "JOB_UNAVAILABLE") {
      res.status(409).json({ error: "This job is no longer available for quoting." });
      return;
    }
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      res.status(409).json({ error: "You already quoted for this job." });
      return;
    }
    throw error;
  }
});

router.post("/marketplace/quotes/:quoteId/price-offers", requireAuth, async (req, res): Promise<void> => {
  const params = CreateRepairPriceOfferParams.safeParse(req.params);
  const body = CreateRepairPriceOfferBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Choose a valid counteroffer amount." });
    return;
  }
  const userId = getAuth(req).userId!;
  const [initial] = await db.select({ quote: repairQuotes, job: repairJobs })
    .from(repairQuotes)
    .innerJoin(repairJobs, eq(repairJobs.id, repairQuotes.jobId))
    .where(eq(repairQuotes.id, params.data.quoteId))
    .limit(1);
  if (!initial || (initial.job.customerId !== userId && initial.quote.engineerId !== userId)) {
    res.status(404).json({ error: "Quote not found." });
    return;
  }
  if (await usersAreBlocked(initial.job.customerId, initial.quote.engineerId)) {
    res.status(403).json({ error: "This marketplace participant is blocked." });
    return;
  }
  const issue = contentIssue([body.data.message]);
  if (issue) {
    res.status(400).json({ error: issue });
    return;
  }
  if (containsExactPostcode(body.data.message ?? "", initial.job.postcode)) {
    res.status(400).json({ error: "Share the full postcode only after both sides agree on the price." });
    return;
  }

  try {
    const quote = await db.transaction(async (tx) => {
      const [job] = await tx.select().from(repairJobs)
        .where(eq(repairJobs.id, initial.job.id)).for("update").limit(1);
      const [lockedQuote] = await tx.select().from(repairQuotes)
        .where(eq(repairQuotes.id, initial.quote.id)).for("update").limit(1);
      if (
        !job ||
        !lockedQuote ||
        job.status !== "open" ||
        !["pending", "negotiating"].includes(lockedQuote.status)
      ) {
        throw new Error("NEGOTIATION_UNAVAILABLE");
      }
      const [activeOffer] = await tx.select().from(repairPriceOffers)
        .where(and(
          eq(repairPriceOffers.quoteId, lockedQuote.id),
          inArray(repairPriceOffers.status, ["pending", "awaiting_proposer"]),
        ))
        .orderBy(desc(repairPriceOffers.createdAt), desc(repairPriceOffers.id))
        .limit(1);
      if (activeOffer?.status === "pending" && activeOffer.proposerId === userId) {
        throw new Error("WAITING_FOR_COUNTERPART");
      }
      await tx.update(repairPriceOffers)
        .set({ status: "superseded" })
        .where(and(
          eq(repairPriceOffers.quoteId, lockedQuote.id),
          inArray(repairPriceOffers.status, ["pending", "awaiting_proposer"]),
        ));
      await tx.insert(repairPriceOffers).values({
        id: randomUUID(),
        quoteId: lockedQuote.id,
        proposerId: userId,
        amountPence: body.data.amountPence,
        message: body.data.message ?? "",
        status: "pending",
      });
      const [updatedQuote] = await tx.update(repairQuotes)
        .set({ status: "negotiating", agreedTotalPence: null })
        .where(eq(repairQuotes.id, lockedQuote.id))
        .returning();
      return updatedQuote;
    });
    res.json(CreateRepairPriceOfferResponse.parse(await quoteResponse(quote)));
  } catch (error) {
    if (error instanceof Error && error.message === "NEGOTIATION_UNAVAILABLE") {
      res.status(409).json({ error: "This repair is no longer open for price negotiation." });
      return;
    }
    if (error instanceof Error && error.message === "WAITING_FOR_COUNTERPART") {
      res.status(409).json({ error: "Wait for the other person to respond, or agree to their response." });
      return;
    }
    throw error;
  }
});

router.post("/marketplace/quotes/:quoteId/price-offers/:offerId/agree", requireAuth, async (req, res): Promise<void> => {
  const params = AgreeRepairPriceOfferParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid price offer." });
    return;
  }
  const userId = getAuth(req).userId!;
  const [initial] = await db.select({ quote: repairQuotes, job: repairJobs })
    .from(repairQuotes)
    .innerJoin(repairJobs, eq(repairJobs.id, repairQuotes.jobId))
    .where(eq(repairQuotes.id, params.data.quoteId))
    .limit(1);
  const [initialOffer] = await db.select().from(repairPriceOffers)
    .where(and(
      eq(repairPriceOffers.id, params.data.offerId),
      eq(repairPriceOffers.quoteId, params.data.quoteId),
    ))
    .limit(1);
  if (!initial || !initialOffer || (initial.job.customerId !== userId && initial.quote.engineerId !== userId)) {
    res.status(404).json({ error: "Price offer not found." });
    return;
  }
  if (await usersAreBlocked(initial.job.customerId, initial.quote.engineerId)) {
    res.status(403).json({ error: "This marketplace participant is blocked." });
    return;
  }

  const isFinalAgreement = initialOffer.status === "awaiting_proposer" && initialOffer.proposerId === userId;
  let connectedAccountId: string | null = null;
  if (isFinalAgreement) {
    const [engineer] = await db.select({
      stripeConnectedAccountId: engineerProfiles.stripeConnectedAccountId,
    }).from(engineerProfiles).where(eq(engineerProfiles.userId, initial.quote.engineerId)).limit(1);
    connectedAccountId = engineer?.stripeConnectedAccountId ?? null;
    if (!connectedAccountId) {
      res.status(409).json({ error: "The engineer needs to finish Stripe payout setup before the price can be agreed." });
      return;
    }
    try {
      if (!(await engineerCanReceivePayout(connectedAccountId))) {
        res.status(409).json({ error: "The engineer needs to finish Stripe payout setup before the price can be agreed." });
        return;
      }
    } catch (error) {
      req.log.error({ err: error, engineerId: initial.quote.engineerId }, "Unable to verify engineer Stripe payout status");
      res.status(503).json({ error: "Engineer payout setup could not be verified. Please try again." });
      return;
    }
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [job] = await tx.select().from(repairJobs)
        .where(eq(repairJobs.id, initial.job.id)).for("update").limit(1);
      const [quote] = await tx.select().from(repairQuotes)
        .where(eq(repairQuotes.id, initial.quote.id)).for("update").limit(1);
      const [offer] = await tx.select().from(repairPriceOffers)
        .where(and(
          eq(repairPriceOffers.id, params.data.offerId),
          eq(repairPriceOffers.quoteId, params.data.quoteId),
        ))
        .for("update")
        .limit(1);
      if (
        !job ||
        !quote ||
        !offer ||
        job.status !== "open" ||
        !["pending", "negotiating"].includes(quote.status) ||
        !["pending", "awaiting_proposer"].includes(offer.status)
      ) {
        throw new Error("AGREEMENT_UNAVAILABLE");
      }

      if (offer.status === "pending" && offer.proposerId !== userId) {
        const [awaiting] = await tx.update(repairPriceOffers)
          .set({ status: "awaiting_proposer", agreedById: userId })
          .where(and(eq(repairPriceOffers.id, offer.id), eq(repairPriceOffers.status, "pending")))
          .returning();
        if (!awaiting) throw new Error("AGREEMENT_UNAVAILABLE");
        return { quote, agreementComplete: false };
      }
      if (
        offer.status !== "awaiting_proposer" ||
        offer.proposerId !== userId ||
        !offer.agreedById ||
        offer.agreedById === userId ||
        !connectedAccountId
      ) {
        throw new Error("AGREEMENT_UNAVAILABLE");
      }

      const split = calculateMarketplaceSplit(offer.amountPence);
      const [acceptedOffer] = await tx.update(repairPriceOffers)
        .set({ status: "accepted" })
        .where(and(eq(repairPriceOffers.id, offer.id), eq(repairPriceOffers.status, "awaiting_proposer")))
        .returning();
      if (!acceptedOffer) throw new Error("AGREEMENT_UNAVAILABLE");
      await tx.update(repairPriceOffers)
        .set({ status: "superseded" })
        .where(and(
          eq(repairPriceOffers.quoteId, quote.id),
          ne(repairPriceOffers.id, offer.id),
          inArray(repairPriceOffers.status, ["pending", "awaiting_proposer"]),
        ));
      const [agreedQuote] = await tx.update(repairQuotes)
        .set({
          status: "pending_payment",
          agreedTotalPence: offer.amountPence,
          stripeCheckoutSessionId: null,
          stripePriceId: null,
        })
        .where(eq(repairQuotes.id, quote.id))
        .returning();
      const [reservedJob] = await tx.update(repairJobs)
        .set({
          status: "pending_payment",
          acceptedQuoteId: quote.id,
          paymentStatus: "pending",
          platformCommissionPence: split.platformCommissionPence,
          engineerPayoutPence: split.engineerPayoutPence,
          stripeConnectedAccountId: connectedAccountId,
          stripePaymentIntentId: null,
          stripeTransferId: null,
          payoutReleasedAt: null,
        })
        .where(and(eq(repairJobs.id, job.id), eq(repairJobs.status, "open")))
        .returning({ id: repairJobs.id });
      if (!agreedQuote || !reservedJob) throw new Error("AGREEMENT_UNAVAILABLE");
      return { quote: agreedQuote, agreementComplete: true };
    });

    let checkoutUrl: string | null = null;
    if (result.agreementComplete && initial.job.customerId === userId) {
      const host = req.get("host");
      if (!host) {
        res.status(400).json({ error: "A secure Checkout return address is unavailable." });
        return;
      }
      checkoutUrl = await createCheckoutForAgreedQuote(
        result.quote.id,
        userId,
        `${req.protocol}://${host}`,
      );
    }
    res.json(AgreeRepairPriceOfferResponse.parse({
      quote: await quoteResponse(result.quote),
      agreementComplete: result.agreementComplete,
      checkoutUrl,
    }));
  } catch (error) {
    if (error instanceof Error && error.message === "AGREEMENT_UNAVAILABLE") {
      res.status(409).json({ error: "This price offer is no longer awaiting agreement." });
      return;
    }
    if (error instanceof Error && error.message === "CHECKOUT_NOT_READY") {
      res.status(409).json({ error: "The agreed price is not ready for Checkout." });
      return;
    }
    if (error instanceof Error && error.message === "CHECKOUT_CANCEL_RACE") {
      res.status(409).json({ error: "The payment selection changed. Refresh and try again." });
      return;
    }
    req.log.error({ err: error, quoteId: params.data.quoteId }, "Unable to complete the price agreement");
    res.status(502).json({ error: "The price was agreed, but Checkout could not be started. You can retry from the job." });
  }
});

router.post("/marketplace/quotes/:quoteId/price-offers/:offerId/decline", requireAuth, async (req, res): Promise<void> => {
  const params = DeclineRepairPriceOfferParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid price offer." });
    return;
  }
  const userId = getAuth(req).userId!;
  const [initial] = await db.select({ quote: repairQuotes, job: repairJobs })
    .from(repairQuotes)
    .innerJoin(repairJobs, eq(repairJobs.id, repairQuotes.jobId))
    .where(eq(repairQuotes.id, params.data.quoteId))
    .limit(1);
  if (!initial || (initial.job.customerId !== userId && initial.quote.engineerId !== userId)) {
    res.status(404).json({ error: "Price offer not found." });
    return;
  }
  if (await usersAreBlocked(initial.job.customerId, initial.quote.engineerId)) {
    res.status(403).json({ error: "This marketplace participant is blocked." });
    return;
  }
  try {
    const quote = await db.transaction(async (tx) => {
      const [job] = await tx.select().from(repairJobs)
        .where(eq(repairJobs.id, initial.job.id)).for("update").limit(1);
      const [lockedQuote] = await tx.select().from(repairQuotes)
        .where(eq(repairQuotes.id, initial.quote.id)).for("update").limit(1);
      const [offer] = await tx.select().from(repairPriceOffers)
        .where(and(
          eq(repairPriceOffers.id, params.data.offerId),
          eq(repairPriceOffers.quoteId, params.data.quoteId),
        ))
        .for("update")
        .limit(1);
      if (
        !job ||
        !lockedQuote ||
        !offer ||
        job.status !== "open" ||
        !["pending", "awaiting_proposer"].includes(offer.status)
      ) {
        throw new Error("OFFER_NO_LONGER_ACTIVE");
      }
      const [declined] = await tx.update(repairPriceOffers)
        .set({ status: "declined" })
        .where(eq(repairPriceOffers.id, offer.id))
        .returning();
      if (!declined) throw new Error("OFFER_NO_LONGER_ACTIVE");
      const [updatedQuote] = await tx.update(repairQuotes)
        .set({ status: "negotiating" })
        .where(eq(repairQuotes.id, lockedQuote.id))
        .returning();
      return updatedQuote;
    });
    res.json(DeclineRepairPriceOfferResponse.parse(await quoteResponse(quote)));
  } catch (error) {
    if (error instanceof Error && error.message === "OFFER_NO_LONGER_ACTIVE") {
      res.status(409).json({ error: "This price offer is no longer open." });
      return;
    }
    throw error;
  }
});

router.post("/marketplace/quotes/:quoteId/accept", requireAuth, async (req, res): Promise<void> => {
  const params = AcceptRepairQuoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid quote." });
    return;
  }
  const userId = getAuth(req).userId!;
  const [row] = await db
    .select({ quote: repairQuotes, job: repairJobs })
    .from(repairQuotes)
    .innerJoin(repairJobs, eq(repairJobs.id, repairQuotes.jobId))
    .where(eq(repairQuotes.id, params.data.quoteId))
    .limit(1);
  if (!row || row.job.customerId !== userId) {
    res.status(404).json({ error: "Quote not found." });
    return;
  }
  if (
    row.job.status !== "pending_payment" ||
    row.job.acceptedQuoteId !== row.quote.id ||
    row.quote.status !== "pending_payment" ||
    row.quote.agreedTotalPence == null
  ) {
    res.status(409).json({ error: "Both parties must agree on the price before Checkout can start." });
    return;
  }
  if (await usersAreBlocked(userId, row.quote.engineerId)) {
    res.status(403).json({ error: "This marketplace participant is blocked." });
    return;
  }
  const [engineer] = await db
    .select({ stripeConnectedAccountId: engineerProfiles.stripeConnectedAccountId })
    .from(engineerProfiles)
    .where(eq(engineerProfiles.userId, row.quote.engineerId))
    .limit(1);
  if (!engineer?.stripeConnectedAccountId) {
    res.status(409).json({ error: "This engineer needs to set up Stripe payouts before you can pay." });
    return;
  }
  try {
    if (!(await engineerCanReceivePayout(engineer.stripeConnectedAccountId))) {
      res.status(409).json({ error: "This engineer needs to finish Stripe payout setup before you can pay." });
      return;
    }
  } catch (error) {
    req.log.error({ err: error, engineerId: row.quote.engineerId }, "Unable to verify engineer Stripe payout status");
    res.status(503).json({ error: "Engineer payout setup could not be verified. Please try again." });
    return;
  }
  try {
    const host = req.get("host");
    if (!host) {
      res.status(400).json({ error: "A secure Checkout return address is unavailable." });
      return;
    }
    const checkoutUrl = await createCheckoutForAgreedQuote(row.quote.id, userId, `${req.protocol}://${host}`);
    res.json(AcceptRepairQuoteResponse.parse({ checkoutUrl }));
  } catch (error) {
    if (error instanceof Error && ["CHECKOUT_NOT_READY", "CHECKOUT_AMOUNT_MISMATCH", "CHECKOUT_ALREADY_COMPLETE", "CHECKOUT_CANCEL_RACE"].includes(error.message)) {
      res.status(409).json({ error: "The agreed payment is no longer available. Refresh the job and try again." });
      return;
    }
    req.log.error({ err: error }, "Unable to create repair checkout");
    res.status(502).json({ error: "Payment checkout could not be started. Your agreed price is still saved." });
  }
});

router.post("/marketplace/payments/confirm", requireAuth, async (req, res): Promise<void> => {
  const body = ConfirmRepairPaymentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid payment session." });
    return;
  }
  const userId = getAuth(req).userId!;
  const stripe = await getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(body.data.sessionId);
  if (session.payment_status !== "paid") {
    res.status(409).json({ error: "Payment has not been completed." });
    return;
  }
  const job = await applyPaidRepairCheckout(session, userId);
  if (!job) {
    res.status(409).json({ error: "The payment does not match the selected repair quote." });
    return;
  }
  res.json(ConfirmRepairPaymentResponse.parse(jobResponse(job)));
});

router.post("/marketplace/quotes/:quoteId/confirm-payment", requireAuth, async (req, res): Promise<void> => {
  const params = ConfirmRepairQuotePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid quote." });
    return;
  }
  const userId = getAuth(req).userId!;
  const [row] = await db
    .select({ job: repairJobs, quote: repairQuotes })
    .from(repairQuotes)
    .innerJoin(repairJobs, eq(repairJobs.id, repairQuotes.jobId))
    .where(and(eq(repairQuotes.id, params.data.quoteId), eq(repairJobs.customerId, userId)))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Quote not found." });
    return;
  }
  if (row.job.acceptedQuoteId !== row.quote.id || !row.quote.stripeCheckoutSessionId) {
    res.status(409).json({ error: "This quote does not have a pending payment session." });
    return;
  }
  const stripe = await getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(row.quote.stripeCheckoutSessionId);
  if (session.payment_status !== "paid") {
    res.status(409).json({ error: "Payment has not been completed yet." });
    return;
  }
  const job = await applyPaidRepairCheckout(session, userId);
  if (!job) {
    res.status(409).json({ error: "The payment does not match the selected repair quote." });
    return;
  }
  res.json(ConfirmRepairQuotePaymentResponse.parse(jobResponse(job)));
});

router.post("/marketplace/quotes/:quoteId/reject", requireAuth, async (req, res): Promise<void> => {
  const params = RejectRepairQuoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid quote." });
    return;
  }
  const userId = getAuth(req).userId!;
  const [row] = await db
    .select({ quote: repairQuotes, customerId: repairJobs.customerId })
    .from(repairQuotes)
    .innerJoin(repairJobs, eq(repairJobs.id, repairQuotes.jobId))
    .where(eq(repairQuotes.id, params.data.quoteId))
    .limit(1);
  if (!row || row.customerId !== userId) {
    res.status(404).json({ error: "Quote not found." });
    return;
  }
  const quote = await db.transaction(async (tx) => {
    const [job] = await tx.select().from(repairJobs)
      .where(eq(repairJobs.id, row.quote.jobId)).for("update").limit(1);
    const [lockedQuote] = await tx.select().from(repairQuotes)
      .where(eq(repairQuotes.id, row.quote.id)).for("update").limit(1);
    if (!job || job.status !== "open" || !lockedQuote || !["pending", "negotiating"].includes(lockedQuote.status)) {
      return null;
    }
    await tx.update(repairPriceOffers)
      .set({ status: "declined" })
      .where(and(
        eq(repairPriceOffers.quoteId, lockedQuote.id),
        inArray(repairPriceOffers.status, ["pending", "awaiting_proposer"]),
      ));
    const [rejected] = await tx.update(repairQuotes)
      .set({ status: "rejected" })
      .where(eq(repairQuotes.id, lockedQuote.id))
      .returning();
    return rejected ?? null;
  });
  if (!quote) {
    res.status(409).json({ error: "This quote can no longer be rejected." });
    return;
  }
  res.json(RejectRepairQuoteResponse.parse(await quoteResponse(quote)));
});

router.post("/marketplace/quotes/:quoteId/cancel-payment", requireAuth, async (req, res): Promise<void> => {
  const params = CancelRepairPaymentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid quote." }); return; }
  const userId = getAuth(req).userId!;
  const stripe = await getStripeClient();
  const reopened = await db.transaction(async (tx) => {
    const [row] = await tx.select({ job: repairJobs, quote: repairQuotes }).from(repairQuotes)
      .innerJoin(repairJobs, eq(repairJobs.id, repairQuotes.jobId))
      .where(and(eq(repairQuotes.id, params.data.quoteId), eq(repairJobs.customerId, userId))).for("update").limit(1);
    if (!row || row.job.status !== "pending_payment" || row.job.acceptedQuoteId !== row.quote.id || row.quote.status !== "pending_payment") return null;
    if (row.quote.stripeCheckoutSessionId) {
      try {
        let session = await stripe.checkout.sessions.retrieve(row.quote.stripeCheckoutSessionId);
        if (session.payment_status === "paid" || session.status === "complete") {
          throw new Error("PAYMENT_ALREADY_COMPLETED");
        }
        if (session.status === "open") {
          try {
            session = await stripe.checkout.sessions.expire(session.id);
          } catch (error) {
            // A concurrent cancellation may have expired it; re-read before deciding.
            req.log.warn({ err: error, sessionId: session.id }, "Stripe session expiry raced");
            session = await stripe.checkout.sessions.retrieve(session.id);
          }
        }
        if (session.payment_status === "paid" || session.status === "complete" || session.status === "open") {
          throw new Error("PAYMENT_ALREADY_COMPLETED");
        }
      } catch (error) {
        if (error instanceof Error && error.message === "PAYMENT_ALREADY_COMPLETED") throw error;
        req.log.error({ err: error, quoteId: row.quote.id }, "Unable to verify or expire Stripe checkout");
        throw new Error("PAYMENT_PROVIDER_UNAVAILABLE");
      }
    }
    await tx.update(repairPriceOffers)
      .set({ status: "superseded" })
      .where(and(
        eq(repairPriceOffers.quoteId, row.quote.id),
        inArray(repairPriceOffers.status, ["pending", "awaiting_proposer", "accepted"]),
      ));
    await tx.update(repairQuotes)
      .set({
        status: "pending",
        agreedTotalPence: null,
        stripeCheckoutSessionId: null,
        stripePriceId: null,
      })
      .where(eq(repairQuotes.id, row.quote.id));
    const [job] = await tx.update(repairJobs).set({
      status: "open",
      acceptedQuoteId: null,
      paymentStatus: "unpaid",
      platformCommissionPence: null,
      engineerPayoutPence: null,
      stripeConnectedAccountId: null,
      stripePaymentIntentId: null,
      stripeTransferId: null,
      payoutReleasedAt: null,
    }).where(eq(repairJobs.id, row.job.id)).returning();
    return job;
  }).catch((error) => {
    if (error instanceof Error && error.message === "PAYMENT_ALREADY_COMPLETED") return "PAID" as const;
    if (error instanceof Error && error.message === "PAYMENT_PROVIDER_UNAVAILABLE") return "PROVIDER_ERROR" as const;
    throw error;
  });
  if (reopened === "PAID") {
    res.status(409).json({ error: "Payment has completed; confirmation can proceed." });
    return;
  }
  if (reopened === "PROVIDER_ERROR") {
    res.status(503).json({ error: "Payment status could not be verified. Try again." });
    return;
  }
  if (!reopened) { res.status(409).json({ error: "This payment can no longer be cancelled." }); return; }
  res.json(CancelRepairPaymentResponse.parse(jobResponse(reopened, undefined, true)));
});

export default router;