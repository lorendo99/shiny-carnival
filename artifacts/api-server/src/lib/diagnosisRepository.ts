import { db, fixMateDiagnoses } from "@workspace/db";
import type { DiagnosisResult as SavedDiagnosis } from "@workspace/api-zod";

interface SaveDiagnosisInput {
  diagnosis: SavedDiagnosis;
  userId: string;
  inventoryItemId?: string | null;
  symptom: string;
  mediaName: string | null;
}

export async function saveDiagnosis({
  diagnosis,
  userId,
  inventoryItemId,
  symptom,
  mediaName,
}: SaveDiagnosisInput): Promise<void> {
  const saved = await db
    .insert(fixMateDiagnoses)
    .values({
      id: diagnosis.id,
      userId,
      inventoryItemId: inventoryItemId ?? null,
      itemType: diagnosis.itemType,
      symptom,
      mediaName,
      result: { ...diagnosis },
    })
    .returning({ id: fixMateDiagnoses.id });

  if (saved.length !== 1 || saved[0]?.id !== diagnosis.id) {
    throw new Error("The generated diagnosis was not saved.");
  }
}