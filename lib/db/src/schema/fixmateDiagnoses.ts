import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const fixMateDiagnoses = pgTable(
  "fixmate_diagnoses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    inventoryItemId: text("inventory_item_id"),
    itemType: text("item_type").notNull(),
    symptom: text("symptom").notNull(),
    mediaName: text("media_name"),
    result: jsonb("result").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("fixmate_diagnoses_user_created_idx").on(table.userId, table.createdAt),
  ],
);