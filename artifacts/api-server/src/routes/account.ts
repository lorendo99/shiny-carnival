import { clerkClient, getAuth } from "@clerk/express";
import { Router, type IRouter, type RequestHandler } from "express";
import {
  db,
  engineerProfiles,
  fixMateDiagnoses,
  fixMateUsers,
  repairJobMessages,
  repairJobResponses,
  repairJobs,
  repairQuotes,
  marketplaceBlocks,
  marketplaceReports,
} from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

const requireAuth: RequestHandler = (req, res, next) => {
  if (!getAuth(req).userId) {
    res.status(401).json({ error: "Sign in to delete your account." });
    return;
  }
  next();
};

router.delete("/account", requireAuth, async (req, res): Promise<void> => {
  const userId = getAuth(req).userId!;

  try {
    const objectPaths = await db.transaction(async (tx) => {
      const ownedJobs = await tx
        .select({ photoRefs: repairJobs.photoRefs })
        .from(repairJobs)
        .where(eq(repairJobs.customerId, userId));

      await tx
        .delete(repairJobMessages)
        .where(or(eq(repairJobMessages.senderId, userId), eq(repairJobMessages.threadEngineerId, userId)));
      await tx.delete(repairJobResponses).where(eq(repairJobResponses.engineerId, userId));
      await tx.delete(repairJobs).where(eq(repairJobs.customerId, userId));
      await tx.delete(marketplaceBlocks).where(or(eq(marketplaceBlocks.blockerId, userId), eq(marketplaceBlocks.blockedUserId, userId)));
      await tx
        .update(marketplaceReports)
        .set({
          reporterId: "Deleted FixMate user",
          targetUserId: null,
          details: null,
        })
        .where(or(eq(marketplaceReports.reporterId, userId), eq(marketplaceReports.targetUserId, userId)));

      await tx
        .update(repairQuotes)
        .set({
          message: "Quote retained after account deletion.",
          estimatedDuration: "Not available",
        })
        .where(eq(repairQuotes.engineerId, userId));
      await tx
        .update(engineerProfiles)
        .set({
          displayName: "Deleted FixMate user",
          postcode: "Deleted",
          skills: [],
          isActive: false,
        })
        .where(eq(engineerProfiles.userId, userId));

      await tx.delete(fixMateDiagnoses).where(eq(fixMateDiagnoses.userId, userId));
      await tx.delete(fixMateUsers).where(eq(fixMateUsers.id, userId));

      return ownedJobs.flatMap(({ photoRefs }) => photoRefs ?? []);
    });

    const deletions = await Promise.allSettled(
      objectPaths.map(async (objectPath) => {
        const file = await storage.getObjectEntityFile(objectPath);
        await file.delete({ ignoreNotFound: true });
      }),
    );
    const failedDeletions = deletions.filter(({ status }) => status === "rejected").length;
    if (failedDeletions) {
      req.log.warn({ failedDeletions, userId }, "Some deleted-account job evidence could not be removed");
    }

    await clerkClient.users.deleteUser(userId);
    res.json({ deleted: true });
  } catch (error) {
    req.log.error({ err: error, userId }, "Account deletion failed");
    res.status(500).json({ error: "Your account could not be deleted. Please try again or contact support." });
  }
});

export default router;