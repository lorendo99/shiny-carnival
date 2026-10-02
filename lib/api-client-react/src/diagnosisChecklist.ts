import type { DiagnosisResult } from "./generated/api.schemas";

export type ChecklistAnswer = "yes" | "no" | "unsure";
export type DiagnosisChecklistAnswers = Partial<Record<
  "noiseWhenSpinning" | "leaksDuringDrainage" | "showsErrorCode" | "happensEveryTime",
  ChecklistAnswer
>>;

export const diagnosisChecklistQuestions = [
  { key: "noiseWhenSpinning", question: "Is the machine making the noise when spinning?" },
  { key: "leaksDuringDrainage", question: "Does it leak only during drainage?" },
  { key: "showsErrorCode", question: "Does the display show an error code?" },
  { key: "happensEveryTime", question: "Does the fault happen every time?" },
] as const;

export function applyDiagnosisChecklist(
  result: Pick<DiagnosisResult, "likelyProblem" | "otherPossibleCauses" | "nextSteps" | "confidence">,
  answers: DiagnosisChecklistAnswers,
): Pick<DiagnosisResult, "likelyProblem" | "otherPossibleCauses" | "nextSteps" | "confidence"> {
  const causes = [...(result.otherPossibleCauses ?? [])];
  const nextSteps = [...result.nextSteps];
  let likelyProblem = result.likelyProblem;
  let confidence = result.confidence;

  if (answers.noiseWhenSpinning === "yes") {
    likelyProblem = "A spin-cycle issue such as an unbalanced load, worn drum bearings, or a drive component.";
    causes.unshift("Worn bearings or a drive component may be producing the noise under load.");
    nextSteps.unshift("Stop high-speed cycles if the noise is harsh, grinding, or getting worse.");
    confidence += 6;
  } else if (answers.noiseWhenSpinning === "no") {
    nextSteps.unshift("Run a quiet observation during fill, wash, and drain to locate when the sound starts.");
  }

  if (answers.leaksDuringDrainage === "yes") {
    likelyProblem = "A drain-path leak, most commonly around the pump, drain hose, filter, or hose connection.";
    causes.unshift("A blocked filter, split hose, or loose pump connection can leak only while water is being pumped out.");
    nextSteps.unshift("Unplug the machine before checking the filter, pump area, or drain hose for water and damage.");
    confidence += 8;
  } else if (answers.leaksDuringDrainage === "no") {
    nextSteps.unshift("Check the door seal, detergent drawer, inlet hose, and under-tray for the leak source.");
  }

  if (answers.showsErrorCode === "yes") {
    causes.unshift("The error code may identify a sensor, water-flow, door-lock, or control fault.");
    nextSteps.unshift("Photograph or write down the exact error code before switching the machine off.");
    confidence += 5;
  } else if (answers.showsErrorCode === "no") {
    nextSteps.unshift("Note any flashing lights or repeated beeps even if there is no written error code.");
  }

  if (answers.happensEveryTime === "yes") {
    nextSteps.unshift("Because the fault is repeatable, avoid repeated test cycles and record exactly when it occurs.");
    confidence += 4;
  } else if (answers.happensEveryTime === "no") {
    causes.unshift("An intermittent connection, load balance, or temperature-related fault is still possible.");
    nextSteps.unshift("Write down the load, cycle, and temperature whenever the fault appears.");
  }

  return {
    likelyProblem,
    otherPossibleCauses: Array.from(new Set(causes)).slice(0, 5),
    nextSteps: Array.from(new Set(nextSteps)).slice(0, 7),
    confidence: Math.min(98, Math.max(0, confidence)),
  };
}