import Stripe from "stripe";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db, engineerProfiles, repairJobs, repairPriceOffers, repairQuotes } from "@workspace/db";
import { getStripeClient } from "./stripeClient";

export const MARKETPLACE_COMMISSION_PERCENT = 15;

export function calculateMarketplaceSplit(totalPence: number) {
  const platformCommissionPence = Math.round((totalPence * MARKETPLACE_COMMISSION_PERCENT) / 100);
  return {
    platformCommissionPence,
    engineerPayoutPence: totalPence - platformCommissionPence,
  };
}

export class MarketplacePayoutError extends Error {
  constructor(
    public readonly code: "PAYOUTS_NOT_ENABLED" | "PAYMENT_NOT_READY" | "TRANSFER_MISMATCH",
    message: string,
  ) {
    super(message);
    this.name = "MarketplacePayoutError";
  }
}

function stripeObjectId(value: string | { id: string } | null | undefined): string | null {
  if (typeof value === "string") return value;
  return value?.id ?? null;
}

export async function refreshEngineerPayoutStatus(userId: string): Promise<boolean> {
  const [profile] = await db
    .select({
      stripeConnectedAccountId: engineerProfiles.stripeConnectedAccountId,
      payoutsEnabled: engineerProfiles.payoutsEnabled,
    })
    .from(engineerProfiles)
    .where(eq(engineerProfiles.userId, userId))
    .limit(1);

  if (!profile?.stripeConnectedAccountId) return false;

  const stripe = await getStripeClient();
  const account = await stripe.accounts.retrieve(profile.stripeConnectedAccountId);
  const payoutsEnabled = "payouts_enabled" in account && account.payouts_enabled;
  if (payoutsEnabled !== profile.payoutsEnabled) {
    await db
      .update(engineerProfiles)
      .set({ payoutsEnabled })
      .where(eq(engineerProfiles.userId, userId));
  }
  return payoutsEnabled;
}

export async function engineerCanReceivePayout(accountId: string): Promise<boolean> {
  const stripe = await getStripeClient();
  const account = await stripe.accounts.retrieve(accountId);
  return "payouts_enabled" in account && account.payouts_enabled;
}

export async function createEngineerPayoutOnboardingLink(userId: string, origin: string): Promise<string | null> {
  const [profile] = await db
    .select()
    .from(engineerProfiles)
    .where(and(eq(engineerProfiles.userId, userId), eq(engineerProfiles.isActive, true)))
    .limit(1);
  if (!profile) return null;

  const stripe = await getStripeClient();
  let accountId = profile.stripeConnectedAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create(
      {
        type: "express",
        country: "GB",
        capabilities: { transfers: { requested: true } },
        metadata: { fixMateEngineerId: userId },
      },
      { idempotencyKey: `fixmate_connect_account_${userId}` },
    );
    accountId = account.id;
    await db
      .update(engineerProfiles)
      .set({ stripeConnectedAccountId: accountId, payoutsEnabled: account.payouts_enabled })
      .where(eq(engineerProfiles.userId, userId));
  }

  const base = origin.replace(/\/+$/, "");
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    return_url: `${base}/marketplace?payout_setup=return`,
    refresh_url: `${base}/marketplace?payout_setup=refresh`,
  });
  return link.url;
}

export async function applyPaidRepairCheckout(
  session: Stripe.Checkout.Session,
  signedInCustomerId?: string,
): Promise<typeof repairJobs.$inferSelect | null> {
  const metadata = session.metadata;
  const jobId = metadata?.jobId;
  const quoteId = metadata?.quoteId;
  const customerId = metadata?.customerId;
  const engineerId = metadata?.engineerId;
  const paymentIntentId = stripeObjectId(session.payment_intent);

  if (
    session.mode !== "payment" ||
    session.payment_status !== "paid" ||
    session.currency !== "gbp" ||
    session.amount_total == null ||
    !Number.isInteger(session.amount_total) ||
    !jobId ||
    !quoteId ||
    !customerId ||
    !engineerId ||
    !paymentIntentId ||
    (signedInCustomerId && signedInCustomerId !== customerId)
  ) {
    return null;
  }

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ job: repairJobs, quote: repairQuotes })
      .from(repairJobs)
      .innerJoin(repairQuotes, eq(repairQuotes.id, quoteId))
      .where(and(eq(repairJobs.id, jobId), eq(repairJobs.customerId, customerId)))
      .for("update")
      .limit(1);
    const agreedTotalPence = current?.quote.agreedTotalPence ?? current?.quote.totalPence;

    if (
      !current ||
      current.quote.jobId !== jobId ||
      current.quote.engineerId !== engineerId ||
      current.job.acceptedQuoteId !== quoteId ||
      current.quote.stripeCheckoutSessionId !== session.id ||
      agreedTotalPence !== session.amount_total ||
      current.job.stripeConnectedAccountId == null
    ) {
      return null;
    }

    const split = calculateMarketplaceSplit(agreedTotalPence);
    if (
      current.job.platformCommissionPence !== split.platformCommissionPence ||
      current.job.engineerPayoutPence !== split.engineerPayoutPence
    ) {
      return null;
    }

    if (current.job.status === "accepted" && current.quote.status === "accepted") {
      if (
        current.job.paymentStatus === "paid" ||
        current.job.paymentStatus === "transfer_pending" ||
        current.job.paymentStatus === "transferred"
      ) {
        return current.job;
      }
    }
    if (
      current.job.status !== "pending_payment" ||
      current.quote.status !== "pending_payment" ||
      current.job.paymentStatus !== "pending"
    ) {
      return null;
    }

    const [acceptedQuote] = await tx
      .update(repairQuotes)
      .set({ status: "accepted" })
      .where(and(eq(repairQuotes.id, quoteId), eq(repairQuotes.status, "pending_payment")))
      .returning();
    if (!acceptedQuote) return null;

    const otherQuotes = await tx
      .select({ id: repairQuotes.id })
      .from(repairQuotes)
      .where(and(eq(repairQuotes.jobId, jobId), ne(repairQuotes.id, quoteId)));
    if (otherQuotes.length) {
      const otherQuoteIds = otherQuotes.map(({ id }) => id);
      await tx
        .update(repairQuotes)
        .set({ status: "rejected" })
        .where(inArray(repairQuotes.id, otherQuoteIds));
      await tx
        .update(repairPriceOffers)
        .set({ status: "superseded" })
        .where(and(
          inArray(repairPriceOffers.quoteId, otherQuoteIds),
          inArray(repairPriceOffers.status, ["pending", "awaiting_proposer"]),
        ));
    }

    const [acceptedJob] = await tx
      .update(repairJobs)
      .set({
        status: "accepted",
        paymentStatus: "paid",
        stripePaymentIntentId: paymentIntentId,
        timeline: (current.job.timeline ?? []).map((event) =>
          event.key === "repair_booked"
            ? { ...event, completed: true, completedAt: event.completedAt ?? new Date().toISOString() }
            : event,
        ),
      })
      .where(
        and(
          eq(repairJobs.id, jobId),
          eq(repairJobs.status, "pending_payment"),
          eq(repairJobs.acceptedQuoteId, quoteId),
        ),
      )
      .returning();
    if (!acceptedJob) return null;
    return acceptedJob;
  });
}

export async function createOrFindEngineerTransfer(
  job: typeof repairJobs.$inferSelect,
  quote: typeof repairQuotes.$inferSelect,
): Promise<Stripe.Transfer> {
  const agreedTotalPence = quote.agreedTotalPence ?? quote.totalPence;
  const split = calculateMarketplaceSplit(agreedTotalPence);
  if (
    job.acceptedQuoteId !== quote.id ||
    quote.jobId !== job.id ||
    quote.status !== "accepted" ||
    job.platformCommissionPence !== split.platformCommissionPence ||
    job.engineerPayoutPence !== split.engineerPayoutPence
  ) {
    throw new MarketplacePayoutError("TRANSFER_MISMATCH", "The repair payout does not match the accepted quote.");
  }
  if (!job.stripeConnectedAccountId || !job.stripePaymentIntentId || job.engineerPayoutPence == null) {
    throw new MarketplacePayoutError("PAYMENT_NOT_READY", "The accepted repair payment is missing payout details.");
  }

  const stripe = await getStripeClient();
  const account = await stripe.accounts.retrieve(job.stripeConnectedAccountId);
  if (!("payouts_enabled" in account) || !account.payouts_enabled) {
    throw new MarketplacePayoutError("PAYOUTS_NOT_ENABLED", "The engineer must finish Stripe payout setup before funds can be released.");
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(job.stripePaymentIntentId, {
    expand: ["latest_charge"],
  });
  if (
    paymentIntent.status !== "succeeded" ||
    paymentIntent.amount !== agreedTotalPence ||
    paymentIntent.currency !== "gbp"
  ) {
    throw new MarketplacePayoutError("PAYMENT_NOT_READY", "The customer payment is not ready for payout.");
  }

  const chargeId = stripeObjectId(paymentIntent.latest_charge);
  if (!chargeId) {
    throw new MarketplacePayoutError("PAYMENT_NOT_READY", "Stripe has not made the paid charge available for transfer.");
  }

  const transferGroup = `FIXMATE_REPAIR_${job.id}`;
  const existing = await stripe.transfers.list({ transfer_group: transferGroup, limit: 100 });
  const existingForJob = existing.data.find((transfer) => transfer.metadata?.jobId === job.id);
  if (existingForJob) {
    if (
      existingForJob.amount !== job.engineerPayoutPence ||
      existingForJob.destination !== job.stripeConnectedAccountId ||
      existingForJob.currency !== "gbp"
    ) {
      throw new MarketplacePayoutError("TRANSFER_MISMATCH", "An existing Stripe transfer does not match this repair payout.");
    }
    return existingForJob;
  }

  return stripe.transfers.create(
    {
      amount: job.engineerPayoutPence,
      currency: "gbp",
      destination: job.stripeConnectedAccountId,
      source_transaction: chargeId,
      transfer_group: transferGroup,
      metadata: {
        jobId: job.id,
        quoteId: quote.id,
        customerId: job.customerId,
        engineerId: quote.engineerId,
      },
    },
    { idempotencyKey: `fixmate_repair_payout_${job.id}` },
  );
}