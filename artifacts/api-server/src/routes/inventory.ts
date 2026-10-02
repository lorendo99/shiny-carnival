import { randomUUID } from "node:crypto";
import { getAuth } from "@clerk/express";
import { Router, type IRouter, type RequestHandler } from "express";
import {
  CreateInventoryDocumentBody,
  CreateInventoryDocumentParams,
  CreateInventoryDocumentResponse,
  CreateInventoryItemBody,
  CreateInventoryItemResponse,
  CreateInventoryRepairBody,
  CreateInventoryRepairParams,
  CreateInventoryRepairResponse,
  CreateInventoryReminderBody,
  CreateInventoryReminderParams,
  CreateInventoryReminderResponse,
  CreateRepairReportShareBody,
  CreateRepairReportShareResponse,
  DeleteInventoryDocumentParams,
  DeleteInventoryItemParams,
  GetInventoryItemParams,
  GetInventoryItemResponse,
  GetRepairReportShareParams,
  GetRepairReportShareResponse,
  ListInventoryDiagnosesParams,
  ListInventoryDiagnosesResponse,
  ListInventoryDocumentsParams,
  ListInventoryDocumentsResponse,
  ListInventoryItemsResponse,
  ListInventoryRemindersParams,
  ListInventoryRemindersResponse,
  ListInventoryRepairsParams,
  ListInventoryRepairsResponse,
  UpdateInventoryItemBody,
  UpdateInventoryItemParams,
  UpdateInventoryItemResponse,
  UpdateInventoryReminderBody,
  UpdateInventoryReminderParams,
  UpdateInventoryReminderResponse,
  UpdateInventoryRepairBody,
  UpdateInventoryRepairParams,
  UpdateInventoryRepairResponse,
} from "@workspace/api-zod";
import {
  db,
  fixMateDiagnoses,
  householdInventoryItems,
  inventoryDocuments,
  inventoryMaintenanceReminders,
  inventoryRepairReportShares,
  inventoryRepairRecords,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { verifyUploadToken } from "./storage";

const router: IRouter = Router();

const requireAuth: RequestHandler = (req, res, next) => {
  if (!getAuth(req).userId) {
    res.status(401).json({ error: "Sign in to manage your household inventory." });
    return;
  }
  next();
};

function userIdFor(req: Parameters<RequestHandler>[0]): string {
  return getAuth(req).userId!;
}

function iso(value: Date): string {
  return value.toISOString();
}

function nullableDate(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function itemResult(item: typeof householdInventoryItems.$inferSelect) {
  return {
    ...item,
    manufacturer: item.manufacturer ?? null,
    model: item.model ?? null,
    serialNumber: item.serialNumber ?? null,
    purchaseDate: nullableDate(item.purchaseDate),
    warrantyStartDate: nullableDate(item.warrantyStartDate),
    warrantyEndDate: nullableDate(item.warrantyEndDate),
    notes: item.notes ?? null,
    createdAt: iso(item.createdAt),
    updatedAt: iso(item.updatedAt),
  };
}

function documentResult(document: typeof inventoryDocuments.$inferSelect) {
  return {
    id: document.id,
    itemId: document.itemId,
    title: document.title,
    documentType: document.documentType,
    objectPath: document.objectPath,
    contentType: document.contentType,
    sizeBytes: document.sizeBytes,
    createdAt: iso(document.createdAt),
  };
}

function reminderResult(reminder: typeof inventoryMaintenanceReminders.$inferSelect) {
  return {
    id: reminder.id,
    itemId: reminder.itemId,
    title: reminder.title,
    dueDate: reminder.dueDate,
    notes: reminder.notes ?? null,
    completed: reminder.completed === "true",
    createdAt: iso(reminder.createdAt),
    updatedAt: iso(reminder.updatedAt),
  };
}

function repairResult(repair: typeof inventoryRepairRecords.$inferSelect) {
  return {
    id: repair.id,
    itemId: repair.itemId,
    diagnosisId: repair.diagnosisId ?? null,
    marketplaceJobId: repair.marketplaceJobId ?? null,
    marketplaceQuoteId: repair.marketplaceQuoteId ?? null,
    fault: repair.fault,
    diagnosis: repair.diagnosis,
    quotePence: repair.quotePence ?? null,
    beforeMediaRefs: repair.beforeMediaRefs ?? [],
    afterMediaRefs: repair.afterMediaRefs ?? [],
    finalRepair: repair.finalRepair,
    finalCostPence: repair.finalCostPence ?? null,
    completedDate: nullableDate(repair.completedDate),
    createdAt: iso(repair.createdAt),
    updatedAt: iso(repair.updatedAt),
  };
}

async function ownedItem(itemId: string, userId: string) {
  const [item] = await db
    .select()
    .from(householdInventoryItems)
    .where(and(eq(householdInventoryItems.id, itemId), eq(householdInventoryItems.userId, userId)))
    .limit(1);
  return item;
}

async function ownedRepair(itemId: string, repairId: string, userId: string) {
  const [repair] = await db
    .select()
    .from(inventoryRepairRecords)
    .where(and(
      eq(inventoryRepairRecords.id, repairId),
      eq(inventoryRepairRecords.itemId, itemId),
      eq(inventoryRepairRecords.userId, userId),
    ))
    .limit(1);
  return repair;
}

router.get("/inventory/items", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(householdInventoryItems)
    .where(eq(householdInventoryItems.userId, userIdFor(req)))
    .orderBy(desc(householdInventoryItems.updatedAt));
  res.json(ListInventoryItemsResponse.parse(rows.map(itemResult)));
});

router.post("/inventory/items", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateInventoryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Add a name and choose an inventory category." });
    return;
  }
  const [item] = await db.insert(householdInventoryItems).values({
    id: randomUUID(),
    userId: userIdFor(req),
    category: parsed.data.category,
    name: parsed.data.name,
    manufacturer: parsed.data.manufacturer ?? null,
    model: parsed.data.model ?? null,
    serialNumber: parsed.data.serialNumber ?? null,
    purchaseDate: nullableDate(parsed.data.purchaseDate),
    warrantyStartDate: nullableDate(parsed.data.warrantyStartDate),
    warrantyEndDate: nullableDate(parsed.data.warrantyEndDate),
    notes: parsed.data.notes ?? null,
  }).returning();
  res.status(201).json(CreateInventoryItemResponse.parse(itemResult(item)));
});

router.get("/inventory/items/:itemId", requireAuth, async (req, res): Promise<void> => {
  const params = GetInventoryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Choose a valid household item." });
    return;
  }
  const item = await ownedItem(params.data.itemId, userIdFor(req));
  if (!item) {
    res.status(404).json({ error: "That household item could not be found." });
    return;
  }
  const [documents, reminders, repairs] = await Promise.all([
    db.select().from(inventoryDocuments).where(eq(inventoryDocuments.itemId, item.id)).orderBy(desc(inventoryDocuments.createdAt)),
    db.select().from(inventoryMaintenanceReminders).where(eq(inventoryMaintenanceReminders.itemId, item.id)).orderBy(inventoryMaintenanceReminders.dueDate),
    db.select().from(inventoryRepairRecords).where(eq(inventoryRepairRecords.itemId, item.id)).orderBy(desc(inventoryRepairRecords.createdAt)),
  ]);
  res.json(GetInventoryItemResponse.parse({
    item: itemResult(item),
    documents: documents.map(documentResult),
    reminders: reminders.map(reminderResult),
    repairs: repairs.map(repairResult),
  }));
});

router.patch("/inventory/items/:itemId", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateInventoryItemParams.safeParse(req.params);
  const body = UpdateInventoryItemBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Add a name and choose an inventory category." });
    return;
  }
  const item = await ownedItem(params.data.itemId, userIdFor(req));
  if (!item) {
    res.status(404).json({ error: "That household item could not be found." });
    return;
  }
  const [updated] = await db.update(householdInventoryItems).set({
    category: body.data.category,
    name: body.data.name,
    manufacturer: body.data.manufacturer ?? null,
    model: body.data.model ?? null,
    serialNumber: body.data.serialNumber ?? null,
    purchaseDate: nullableDate(body.data.purchaseDate),
    warrantyStartDate: nullableDate(body.data.warrantyStartDate),
    warrantyEndDate: nullableDate(body.data.warrantyEndDate),
    notes: body.data.notes ?? null,
  }).where(eq(householdInventoryItems.id, item.id)).returning();
  res.json(UpdateInventoryItemResponse.parse(itemResult(updated)));
});

router.delete("/inventory/items/:itemId", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteInventoryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Choose a valid household item." });
    return;
  }
  const deleted = await db.delete(householdInventoryItems)
    .where(and(eq(householdInventoryItems.id, params.data.itemId), eq(householdInventoryItems.userId, userIdFor(req))))
    .returning({ id: householdInventoryItems.id });
  if (!deleted[0]) {
    res.status(404).json({ error: "That household item could not be found." });
    return;
  }
  res.sendStatus(204);
});

router.get("/inventory/items/:itemId/diagnoses", requireAuth, async (req, res): Promise<void> => {
  const params = ListInventoryDiagnosesParams.safeParse(req.params);
  if (!params.success || !(await ownedItem(params.data.itemId, userIdFor(req)))) {
    res.status(404).json({ error: "That household item could not be found." });
    return;
  }
  const rows = await db.select({ result: fixMateDiagnoses.result })
    .from(fixMateDiagnoses)
    .where(and(
      eq(fixMateDiagnoses.inventoryItemId, params.data.itemId),
      eq(fixMateDiagnoses.userId, userIdFor(req)),
    ))
    .orderBy(desc(fixMateDiagnoses.createdAt));
  const results = rows.map(({ result }) => result);
  res.json(ListInventoryDiagnosesResponse.parse(results));
});

router.get("/inventory/items/:itemId/documents", requireAuth, async (req, res): Promise<void> => {
  const params = ListInventoryDocumentsParams.safeParse(req.params);
  if (!params.success || !(await ownedItem(params.data.itemId, userIdFor(req)))) {
    res.status(404).json({ error: "That household item could not be found." });
    return;
  }
  const documents = await db.select().from(inventoryDocuments)
    .where(eq(inventoryDocuments.itemId, params.data.itemId))
    .orderBy(desc(inventoryDocuments.createdAt));
  res.json(ListInventoryDocumentsResponse.parse(documents.map(documentResult)));
});

router.post("/inventory/items/:itemId/documents", requireAuth, async (req, res): Promise<void> => {
  const params = CreateInventoryDocumentParams.safeParse(req.params);
  const body = CreateInventoryDocumentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Choose a document and its upload details." });
    return;
  }
  if (!(await ownedItem(params.data.itemId, userIdFor(req)))) {
    res.status(404).json({ error: "That household item could not be found." });
    return;
  }
  const upload = body.data;
  if (!verifyUploadToken(upload.objectPath, upload.contentType, upload.sizeBytes, upload.expiresAt.toISOString(), upload.uploadToken, userIdFor(req))) {
    res.status(400).json({ error: "That upload is no longer valid. Upload the document again." });
    return;
  }
  const [document] = await db.insert(inventoryDocuments).values({
    id: randomUUID(),
    itemId: params.data.itemId,
    userId: userIdFor(req),
    title: upload.title,
    documentType: upload.documentType,
    objectPath: upload.objectPath,
    contentType: upload.contentType,
    sizeBytes: upload.sizeBytes,
  }).returning();
  res.status(201).json(CreateInventoryDocumentResponse.parse(documentResult(document)));
});

router.delete("/inventory/items/:itemId/documents/:documentId", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteInventoryDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Choose a valid document." });
    return;
  }
  const deleted = await db.delete(inventoryDocuments).where(and(
    eq(inventoryDocuments.id, params.data.documentId),
    eq(inventoryDocuments.itemId, params.data.itemId),
    eq(inventoryDocuments.userId, userIdFor(req)),
  )).returning({ id: inventoryDocuments.id });
  if (!deleted[0]) {
    res.status(404).json({ error: "That document could not be found." });
    return;
  }
  res.sendStatus(204);
});

router.get("/inventory/items/:itemId/reminders", requireAuth, async (req, res): Promise<void> => {
  const params = ListInventoryRemindersParams.safeParse(req.params);
  if (!params.success || !(await ownedItem(params.data.itemId, userIdFor(req)))) {
    res.status(404).json({ error: "That household item could not be found." });
    return;
  }
  const reminders = await db.select().from(inventoryMaintenanceReminders)
    .where(eq(inventoryMaintenanceReminders.itemId, params.data.itemId))
    .orderBy(inventoryMaintenanceReminders.dueDate);
  res.json(ListInventoryRemindersResponse.parse(reminders.map(reminderResult)));
});

router.post("/inventory/items/:itemId/reminders", requireAuth, async (req, res): Promise<void> => {
  const params = CreateInventoryReminderParams.safeParse(req.params);
  const body = CreateInventoryReminderBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Add a reminder title and due date." });
    return;
  }
  if (!(await ownedItem(params.data.itemId, userIdFor(req)))) {
    res.status(404).json({ error: "That household item could not be found." });
    return;
  }
  const [reminder] = await db.insert(inventoryMaintenanceReminders).values({
    id: randomUUID(),
    itemId: params.data.itemId,
    userId: userIdFor(req),
    title: body.data.title,
    dueDate: nullableDate(body.data.dueDate)!,
    notes: body.data.notes ?? null,
  }).returning();
  res.status(201).json(CreateInventoryReminderResponse.parse(reminderResult(reminder)));
});

router.patch("/inventory/items/:itemId/reminders/:reminderId", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateInventoryReminderParams.safeParse(req.params);
  const body = UpdateInventoryReminderBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Choose a valid reminder update." });
    return;
  }
  const [reminder] = await db.select().from(inventoryMaintenanceReminders).where(and(
    eq(inventoryMaintenanceReminders.id, params.data.reminderId),
    eq(inventoryMaintenanceReminders.itemId, params.data.itemId),
    eq(inventoryMaintenanceReminders.userId, userIdFor(req)),
  )).limit(1);
  if (!reminder) {
    res.status(404).json({ error: "That reminder could not be found." });
    return;
  }
  const [updated] = await db.update(inventoryMaintenanceReminders).set({
    ...(body.data.title === undefined ? {} : { title: body.data.title }),
    ...(body.data.dueDate === undefined ? {} : { dueDate: nullableDate(body.data.dueDate)! }),
    ...(body.data.notes === undefined ? {} : { notes: body.data.notes }),
    ...(body.data.completed === undefined ? {} : { completed: body.data.completed ? "true" : "false" }),
  }).where(eq(inventoryMaintenanceReminders.id, reminder.id)).returning();
  res.json(UpdateInventoryReminderResponse.parse(reminderResult(updated)));
});

router.get("/inventory/items/:itemId/repairs", requireAuth, async (req, res): Promise<void> => {
  const params = ListInventoryRepairsParams.safeParse(req.params);
  if (!params.success || !(await ownedItem(params.data.itemId, userIdFor(req)))) {
    res.status(404).json({ error: "That household item could not be found." });
    return;
  }
  const repairs = await db.select().from(inventoryRepairRecords)
    .where(eq(inventoryRepairRecords.itemId, params.data.itemId))
    .orderBy(desc(inventoryRepairRecords.createdAt));
  res.json(ListInventoryRepairsResponse.parse(repairs.map(repairResult)));
});

router.post("/inventory/items/:itemId/repairs", requireAuth, async (req, res): Promise<void> => {
  const params = CreateInventoryRepairParams.safeParse(req.params);
  const body = CreateInventoryRepairBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Add the fault, diagnosis, and final repair details." });
    return;
  }
  if (!(await ownedItem(params.data.itemId, userIdFor(req)))) {
    res.status(404).json({ error: "That household item could not be found." });
    return;
  }
  if (body.data.diagnosisId) {
    const [diagnosis] = await db.select({ id: fixMateDiagnoses.id }).from(fixMateDiagnoses).where(and(
      eq(fixMateDiagnoses.id, body.data.diagnosisId),
      eq(fixMateDiagnoses.userId, userIdFor(req)),
      eq(fixMateDiagnoses.inventoryItemId, params.data.itemId),
    )).limit(1);
    if (!diagnosis) {
      res.status(400).json({ error: "Choose a diagnosis saved for this household item." });
      return;
    }
  }
  const [repair] = await db.insert(inventoryRepairRecords).values({
    id: randomUUID(),
    itemId: params.data.itemId,
    userId: userIdFor(req),
    diagnosisId: body.data.diagnosisId ?? null,
    marketplaceJobId: body.data.marketplaceJobId ?? null,
    marketplaceQuoteId: body.data.marketplaceQuoteId ?? null,
    fault: body.data.fault,
    diagnosis: body.data.diagnosis,
    quotePence: body.data.quotePence ?? null,
    beforeMediaRefs: body.data.beforeMediaRefs ?? [],
    afterMediaRefs: body.data.afterMediaRefs ?? [],
    finalRepair: body.data.finalRepair,
    finalCostPence: body.data.finalCostPence ?? null,
    completedDate: nullableDate(body.data.completedDate),
  }).returning();
  res.status(201).json(CreateInventoryRepairResponse.parse(repairResult(repair)));
});

router.patch("/inventory/items/:itemId/repairs/:repairId", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateInventoryRepairParams.safeParse(req.params);
  const body = UpdateInventoryRepairBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Choose a valid repair update." });
    return;
  }
  const repair = await ownedRepair(params.data.itemId, params.data.repairId, userIdFor(req));
  if (!repair) {
    res.status(404).json({ error: "That repair record could not be found." });
    return;
  }
  const [updated] = await db.update(inventoryRepairRecords).set({
    diagnosisId: body.data.diagnosisId ?? null,
    marketplaceJobId: body.data.marketplaceJobId ?? null,
    marketplaceQuoteId: body.data.marketplaceQuoteId ?? null,
    fault: body.data.fault,
    diagnosis: body.data.diagnosis,
    quotePence: body.data.quotePence ?? null,
    beforeMediaRefs: body.data.beforeMediaRefs ?? [],
    afterMediaRefs: body.data.afterMediaRefs ?? [],
    finalRepair: body.data.finalRepair,
    finalCostPence: body.data.finalCostPence ?? null,
    completedDate: nullableDate(body.data.completedDate),
  }).where(eq(inventoryRepairRecords.id, repair.id)).returning();
  res.json(UpdateInventoryRepairResponse.parse(repairResult(updated)));
});

router.post("/repair-reports", requireAuth, async (req, res): Promise<void> => {
  const body = CreateRepairReportShareBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Choose the fields and media to share." });
    return;
  }
  const userId = userIdFor(req);
  const item = await ownedItem(body.data.itemId, userId);
  if (!item) {
    res.status(404).json({ error: "That household item could not be found." });
    return;
  }
  const repair = body.data.repairRecordId
    ? await ownedRepair(item.id, body.data.repairRecordId, userId)
    : undefined;
  if (body.data.repairRecordId && !repair) {
    res.status(404).json({ error: "That repair record could not be found." });
    return;
  }
  const allowedMedia = new Set([
    ...(repair?.beforeMediaRefs ?? []),
    ...(repair?.afterMediaRefs ?? []),
  ]);
  if (body.data.selection.mediaRefs.some((ref) => !allowedMedia.has(ref))) {
    res.status(400).json({ error: "Only media attached to this repair record can be shared." });
    return;
  }
  if (body.data.selection.includeRepairRecord && !repair) {
    res.status(400).json({ error: "Choose a repair record before sharing its details." });
    return;
  }
  const snapshot: Record<string, unknown> = {};
  if (body.data.selection.includeItem) {
    snapshot.item = { name: item.name, category: item.category };
  }
  if (body.data.selection.includeModel) {
    snapshot.model = {
      manufacturer: item.manufacturer,
      model: item.model,
      serialNumber: item.serialNumber,
    };
  }
  if (body.data.selection.includeProblem && body.data.problem) snapshot.problem = body.data.problem;
  if (body.data.selection.includeQuestions && body.data.questions) snapshot.questions = body.data.questions;
  if (body.data.selection.includeDiagnosis && repair) {
    snapshot.diagnosis = repair.diagnosis;
  }
  if (body.data.selection.includeSafetyWarnings && repair?.diagnosisId) {
    const [diagnosis] = await db.select({ result: fixMateDiagnoses.result }).from(fixMateDiagnoses)
      .where(and(eq(fixMateDiagnoses.id, repair.diagnosisId), eq(fixMateDiagnoses.userId, userId))).limit(1);
    const result = diagnosis?.result as Record<string, unknown> | undefined;
    if (result) {
      snapshot.safetyWarnings = {
        safetyLevel: result.safetyLevel,
        safetyNote: result.safetyNote,
        professionalInspection: result.professionalInspection,
      };
    }
  }
  if (body.data.selection.includeRepairRecord && repair) {
    snapshot.repair = {
      fault: repair.fault,
      diagnosis: repair.diagnosis,
      quotePence: repair.quotePence,
      finalRepair: repair.finalRepair,
      finalCostPence: repair.finalCostPence,
      completedDate: repair.completedDate,
    };
  }
  if (body.data.selection.mediaRefs.length > 0) snapshot.mediaRefs = body.data.selection.mediaRefs;
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [share] = await db.insert(inventoryRepairReportShares).values({
    id,
    itemId: item.id,
    userId,
    repairRecordId: repair?.id ?? null,
    selection: body.data.selection,
    snapshot,
    expiresAt,
  }).returning();
  res.status(201).json(CreateRepairReportShareResponse.parse({
    id: share.id,
    itemId: share.itemId,
    url: `${req.protocol}://${req.get("host")}/api/repair-reports/${share.id}`,
    createdAt: iso(share.createdAt),
    expiresAt: iso(expiresAt),
  }));
});

router.get("/repair-reports/:reportId", async (req, res): Promise<void> => {
  const params = GetRepairReportShareParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: "That repair report could not be found." });
    return;
  }
  const [share] = await db.select().from(inventoryRepairReportShares)
    .where(eq(inventoryRepairReportShares.id, params.data.reportId)).limit(1);
  if (!share || share.revokedAt || (share.expiresAt && share.expiresAt.getTime() <= Date.now())) {
    res.status(404).json({ error: "That repair report could not be found or has expired." });
    return;
  }
  res.json(GetRepairReportShareResponse.parse({
    id: share.id,
    createdAt: iso(share.createdAt),
    expiresAt: share.expiresAt ? iso(share.expiresAt) : null,
    fields: share.snapshot,
  }));
});

export default router;