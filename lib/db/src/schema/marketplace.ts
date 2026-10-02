import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type RepairTimelineEvent = {
  key: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
};

export type RepairReminder = {
  id: string;
  kind: string;
  label: string;
  dueAt: string;
  completed: boolean;
  createdAt: string;
};

export const fixMateUsers = pgTable("fixmate_users", {
  id: text("id").primaryKey(),
  isPremium: boolean("is_premium").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const engineerProfiles = pgTable("engineer_profiles", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  postcode: text("postcode").notNull(),
  skills: text("skills").array().notNull(),
  identityVerified: boolean("identity_verified").notNull().default(false),
  businessDetailsVerified: boolean("business_details_verified").notNull().default(false),
  insuranceEvidenceProvided: boolean("insurance_evidence_provided").notNull().default(false),
  qualificationsProvided: boolean("qualifications_provided").notNull().default(false),
  ratingHundredths: integer("rating_hundredths").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  completedJobsCount: integer("completed_jobs_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  stripeConnectedAccountId: text("stripe_connected_account_id"),
  payoutsEnabled: boolean("payouts_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const repairJobs = pgTable(
  "repair_jobs",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id").notNull(),
    diagnosisId: text("diagnosis_id"),
    title: text("title").notNull(),
    itemType: text("item_type").notNull(),
    category: text("category").notNull().default("appliance"),
    description: text("description").notNull(),
    postcode: text("postcode").notNull(),
    photoRefs: text("photo_refs").array().notNull().default([]),
    status: text("status").notNull().default("open"),
    acceptedQuoteId: text("accepted_quote_id"),
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    platformCommissionPence: integer("platform_commission_pence"),
    engineerPayoutPence: integer("engineer_payout_pence"),
    stripeConnectedAccountId: text("stripe_connected_account_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeTransferId: text("stripe_transfer_id"),
    payoutReleasedAt: timestamp("payout_released_at", { withTimezone: true }),
    timeline: jsonb("timeline").$type<RepairTimelineEvent[]>().notNull().default([]),
    reminders: jsonb("reminders").$type<RepairReminder[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("repair_jobs_customer_created_idx").on(table.customerId, table.createdAt),
    index("repair_jobs_status_created_idx").on(table.status, table.createdAt),
  ],
);

export const repairJobResponses = pgTable(
  "repair_job_responses",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").notNull().references(() => repairJobs.id, { onDelete: "cascade" }),
    engineerId: text("engineer_id").notNull().references(() => engineerProfiles.userId),
    status: text("status").notNull().default("interested"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("repair_job_responses_job_engineer_unique").on(table.jobId, table.engineerId),
    index("repair_job_responses_job_status_idx").on(table.jobId, table.status),
    index("repair_job_responses_engineer_status_idx").on(table.engineerId, table.status),
  ],
);

export const repairQuotes = pgTable(
  "repair_quotes",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").notNull().references(() => repairJobs.id, { onDelete: "cascade" }),
    engineerId: text("engineer_id").notNull().references(() => engineerProfiles.userId),
    message: text("message").notNull(),
    estimatedDuration: text("estimated_duration").notNull().default("Estimate not provided"),
    laborPence: integer("labor_pence").notNull(),
    toolsAndMaterialsPence: integer("tools_and_materials_pence").notNull(),
    callOutFeePence: integer("call_out_fee_pence").notNull().default(0),
    estimatedArrival: text("estimated_arrival").notNull().default("Not provided"),
    warranty: text("warranty").notNull().default("Not provided"),
    earliestAvailability: text("earliest_availability").notNull().default("Not provided"),
    subtotalPence: integer("subtotal_pence").notNull(),
    premiumDiscountPence: integer("premium_discount_pence").notNull().default(0),
    totalPence: integer("total_pence").notNull(),
    agreedTotalPence: integer("agreed_total_pence"),
    status: text("status").notNull().default("pending"),
    stripePriceId: text("stripe_price_id"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("repair_quotes_job_engineer_unique").on(table.jobId, table.engineerId),
    index("repair_quotes_job_status_idx").on(table.jobId, table.status),
    index("repair_quotes_engineer_status_idx").on(table.engineerId, table.status),
  ],
);

export const repairPriceOffers = pgTable(
  "repair_price_offers",
  {
    id: text("id").primaryKey(),
    quoteId: text("quote_id").notNull().references(() => repairQuotes.id, { onDelete: "cascade" }),
    proposerId: text("proposer_id").notNull(),
    agreedById: text("agreed_by_id"),
    amountPence: integer("amount_pence").notNull(),
    message: text("message").notNull().default(""),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("repair_price_offers_quote_created_idx").on(table.quoteId, table.createdAt),
    index("repair_price_offers_quote_status_idx").on(table.quoteId, table.status),
  ],
);

export const marketplaceReports = pgTable(
  "marketplace_reports",
  {
    id: text("id").primaryKey(),
    reporterId: text("reporter_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    targetUserId: text("target_user_id"),
    reason: text("reason").notNull(),
    details: text("details"),
    status: text("status").notNull().default("open"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("marketplace_reports_status_created_idx").on(table.status, table.createdAt),
    index("marketplace_reports_target_idx").on(table.targetType, table.targetId),
  ],
);

export const marketplaceBlocks = pgTable(
  "marketplace_blocks",
  {
    blockerId: text("blocker_id").notNull(),
    blockedUserId: text("blocked_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("marketplace_blocks_pair_unique").on(table.blockerId, table.blockedUserId),
    index("marketplace_blocks_blocker_idx").on(table.blockerId),
    index("marketplace_blocks_blocked_idx").on(table.blockedUserId),
  ],
);

export const repairJobMessages = pgTable(
  "repair_job_messages",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").notNull().references(() => repairJobs.id, { onDelete: "cascade" }),
    senderId: text("sender_id").notNull(),
    threadEngineerId: text("thread_engineer_id").notNull().references(() => engineerProfiles.userId),
    senderRole: text("sender_role").notNull(),
    senderDisplayLabel: text("sender_display_label").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("repair_job_messages_job_created_idx").on(table.jobId, table.createdAt),
  ],
);