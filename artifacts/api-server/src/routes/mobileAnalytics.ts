import { randomUUID } from "node:crypto";
import { getAuth } from "@clerk/express";
import { Router, type IRouter } from "express";
import { db, mobileSubscriptionEvents } from "@workspace/db";
import { allowRequest } from "../lib/requestLimits";

const router: IRouter = Router();

const allowedEvents = new Set([
  "plus_screen_viewed",
  "monthly_plan_selected",
  "annual_plan_selected",
  "purchase_started",
  "purchase_completed",
  "purchase_failed",
  "restore_completed",
]);

const allowedPlans = new Set(["monthly", "annual"]);

function optionalString(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

router.post("/mobile-analytics/subscription-events", async (req, res): Promise<void> => {
  if (!allowRequest(req, "mobile-subscription-events", 120)) {
    res.status(429).json({ error: "Too many subscription events." });
    return;
  }

  const eventName = optionalString(req.body?.eventName, 64);
  if (!eventName || !allowedEvents.has(eventName)) {
    res.status(400).json({ error: "Unsupported subscription event." });
    return;
  }

  const plan = optionalString(req.body?.plan, 16);
  if (plan && !allowedPlans.has(plan)) {
    res.status(400).json({ error: "Unsupported subscription plan." });
    return;
  }

  try {
    await db.insert(mobileSubscriptionEvents).values({
      id: randomUUID(),
      userId: getAuth(req).userId ?? null,
      anonymousId: optionalString(req.body?.anonymousId, 120),
      eventName,
      plan,
      packageIdentifier: optionalString(req.body?.packageIdentifier, 160),
      productIdentifier: optionalString(req.body?.productIdentifier, 160),
      platform: "mobile",
    });
    res.status(204).end();
  } catch (error) {
    req.log.warn({ err: error, eventName }, "Mobile subscription event could not be recorded");
    res.status(503).json({ error: "Subscription event tracking is temporarily unavailable." });
  }
});

export default router;