import { date, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const householdInventoryItems = pgTable(
  "household_inventory_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    category: text("category").notNull(),
    name: text("name").notNull(),
    manufacturer: text("manufacturer"),
    model: text("model"),
    serialNumber: text("serial_number"),
    purchaseDate: date("purchase_date", { mode: "string" }),
    warrantyStartDate: date("warranty_start_date", { mode: "string" }),
    warrantyEndDate: date("warranty_end_date", { mode: "string" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("household_inventory_items_user_created_idx").on(table.userId, table.createdAt),
    index("household_inventory_items_user_category_idx").on(table.userId, table.category),
  ],
);

export const inventoryDocuments = pgTable(
  "inventory_documents",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull().references(() => householdInventoryItems.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    documentType: text("document_type").notNull(),
    objectPath: text("object_path").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("inventory_documents_item_created_idx").on(table.itemId, table.createdAt),
    index("inventory_documents_user_idx").on(table.userId),
  ],
);

export const inventoryMaintenanceReminders = pgTable(
  "inventory_maintenance_reminders",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull().references(() => householdInventoryItems.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    notes: text("notes"),
    completed: text("completed").notNull().default("false"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("inventory_reminders_item_due_idx").on(table.itemId, table.dueDate),
    index("inventory_reminders_user_due_idx").on(table.userId, table.dueDate),
  ],
);

export const inventoryRepairRecords = pgTable(
  "inventory_repair_records",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull().references(() => householdInventoryItems.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    diagnosisId: text("diagnosis_id"),
    marketplaceJobId: text("marketplace_job_id"),
    marketplaceQuoteId: text("marketplace_quote_id"),
    fault: text("fault").notNull(),
    diagnosis: text("diagnosis").notNull(),
    quotePence: integer("quote_pence"),
    beforeMediaRefs: text("before_media_refs").array().notNull().default([]),
    afterMediaRefs: text("after_media_refs").array().notNull().default([]),
    finalRepair: text("final_repair").notNull(),
    finalCostPence: integer("final_cost_pence"),
    completedDate: date("completed_date", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("inventory_repairs_item_created_idx").on(table.itemId, table.createdAt),
    index("inventory_repairs_user_idx").on(table.userId),
  ],
);

export type RepairReportSelection = {
  includeItem: boolean;
  includeModel: boolean;
  includeProblem: boolean;
  includeDiagnosis: boolean;
  includeSafetyWarnings: boolean;
  includeQuestions: boolean;
  includeRepairRecord: boolean;
  mediaRefs: string[];
};

export const inventoryRepairReportShares = pgTable(
  "inventory_repair_report_shares",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull().references(() => householdInventoryItems.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    repairRecordId: text("repair_record_id").references(() => inventoryRepairRecords.id, { onDelete: "set null" }),
    selection: jsonb("selection").$type<RepairReportSelection>().notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("inventory_report_shares_item_created_idx").on(table.itemId, table.createdAt),
    index("inventory_report_shares_user_idx").on(table.userId),
  ],
);

export const insertHouseholdInventoryItemSchema = createInsertSchema(householdInventoryItems);
export const insertInventoryDocumentSchema = createInsertSchema(inventoryDocuments);
export const insertInventoryMaintenanceReminderSchema = createInsertSchema(inventoryMaintenanceReminders);
export const insertInventoryRepairRecordSchema = createInsertSchema(inventoryRepairRecords);
export type HouseholdInventoryItem = typeof householdInventoryItems.$inferSelect;
export type InventoryDocument = typeof inventoryDocuments.$inferSelect;
export type InventoryMaintenanceReminder = typeof inventoryMaintenanceReminders.$inferSelect;
export type InventoryRepairRecord = typeof inventoryRepairRecords.$inferSelect;
export type InventoryRepairReportShare = typeof inventoryRepairReportShares.$inferSelect;
export type HouseholdInventoryItemInsert = z.infer<typeof insertHouseholdInventoryItemSchema>;