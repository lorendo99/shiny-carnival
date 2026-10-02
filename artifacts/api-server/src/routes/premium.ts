import { getAuth } from "@clerk/express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { Router, type IRouter, type RequestHandler } from "express";
import { db, fixMateUsers } from "@workspace/db";
import { SyncPremiumResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const connectors = new ReplitConnectors();

const requireAuth: RequestHandler = (req, res, next) => {
  if (!getAuth(req).userId) {
    res.status(401).json({ error: "Sign in to verify FixMate Plus." });
    return;
  }
  next();
};

function hasFixmateEntitlement(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasFixmateEntitlement);
  const object = value as Record<string, unknown>;
  if (object.lookup_key === "fixmate_plus" || object.lookupKey === "fixmate_plus") return true;
  return Object.entries(object).some(([key, child]) =>
    key === "fixmate_plus" ? Boolean(child) : hasFixmateEntitlement(child),
  );
}

router.post("/premium/sync", requireAuth, async (req, res): Promise<void> => {
  const userId = getAuth(req).userId!;
  const projectId = process.env.REVENUECAT_PROJECT_ID;
  if (!projectId) {
    res.status(502).json({ error: "Premium verification is temporarily unavailable." });
    return;
  }
  try {
    const path = `/v2/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(userId)}/active_entitlements`;
    const response = await connectors.proxy("revenuecat", path, { method: "GET" });
    if (!response.ok) throw new Error(`RevenueCat returned ${response.status}`);
    const payload: unknown = await response.json();
    const isPremium = hasFixmateEntitlement(payload);
    await db.insert(fixMateUsers).values({ id: userId, isPremium })
      .onConflictDoUpdate({ target: fixMateUsers.id, set: { isPremium } });
    res.json(SyncPremiumResponse.parse({ isPremium }));
  } catch (error) {
    req.log.error({ err: error }, "RevenueCat premium verification unavailable");
    res.status(502).json({ error: "Premium verification is temporarily unavailable. Please try again." });
  }
});

export default router;