import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const mobileSubscriptionEvents = pgTable(
  "mobile_subscription_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    anonymousId: text("anonymous_id"),
    eventName: text("event_name").notNull(),
    plan: text("plan"),
    packageIdentifier: text("package_identifier"),
    productIdentifier: text("product_identifier"),
    platform: text("platform").notNull().default("mobile"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("mobile_subscription_events_name_created_idx").on(table.eventName, table.createdAt),
    index("mobile_subscription_events_user_created_idx").on(table.userId, table.createdAt),
  ],
);