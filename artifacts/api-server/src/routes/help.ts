import { getAuth } from "@clerk/express";
import { Router, type IRouter, type RequestHandler } from "express";
import { HelpChatBody, HelpChatResponse, ListNotificationsResponse } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, engineerProfiles, repairJobMessages, repairJobs, repairQuotes } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { allowRequest } from "../lib/requestLimits";

const router: IRouter = Router();
const requireAuth: RequestHandler = (req, res, next) => {
  if (!getAuth(req).userId) {
    res.status(401).json({ error: "Sign in to use FixMate support." });
    return;
  }
  next();
};

const systemPrompt = `You are FixMate Help, a careful support assistant. Answer questions about using FixMate, accounts, repair jobs, quotes, payments, and marketplace messaging. Give safe, general troubleshooting steps when useful. Never claim to have contacted staff, changed an account, checked a payment, or accessed facts you do not have. Direct complaints, privacy requests, legal matters, and payment disputes to FixMate's Contact Us page. For urgent hazards (fire, gas, exposed live electricity, structural danger, or injury), tell the user to stop work, leave the danger area, contact emergency services when appropriate, and use a qualified professional. Do not request secrets, passwords, full payment card numbers, or custom instructions.`;

router.post("/help/chat", requireAuth, async (req, res): Promise<void> => {
  if (!allowRequest(req, "help-chat", 20)) {
    res.status(429).json({ error: "Too many help requests. Try again later." });
    return;
  }
  const parsed = HelpChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ask a question of up to 2,000 characters." });
    return;
  }
  try {
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...(parsed.data.priorTurns ?? []).map((turn) => ({ role: turn.role, content: turn.content })),
      { role: "user" as const, content: parsed.data.question },
    ];
    const completion = await openai.chat.completions.create({
      model: "gpt-5.6-luna",
      messages,
      max_completion_tokens: 8192,
    });
    const answer = completion.choices[0]?.message?.content?.trim();
    if (!answer) throw new Error("Empty assistant response");
    res.json(HelpChatResponse.parse({ answer }));
  } catch (error) {
    req.log.error({ err: error }, "Help assistant unavailable");
    res.status(502).json({ error: "FixMate Help is temporarily unavailable. Please try again." });
  }
});

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const userId = getAuth(req).userId!;
  try {
    const [customerQuotes, customerJobs, engineerQuotes, engineerMessages, customerMessages] = await Promise.all([
      db.select({ quote: repairQuotes, job: repairJobs, engineerName: engineerProfiles.displayName })
        .from(repairQuotes).innerJoin(repairJobs, eq(repairJobs.id, repairQuotes.jobId))
        .innerJoin(engineerProfiles, eq(engineerProfiles.userId, repairQuotes.engineerId))
        .where(eq(repairJobs.customerId, userId)).orderBy(desc(repairQuotes.createdAt)).limit(50),
      db.select().from(repairJobs).where(eq(repairJobs.customerId, userId)).orderBy(desc(repairJobs.updatedAt)).limit(50),
      db.select({ quote: repairQuotes, job: repairJobs })
        .from(repairQuotes).innerJoin(repairJobs, eq(repairJobs.id, repairQuotes.jobId))
        .where(eq(repairQuotes.engineerId, userId)).orderBy(desc(repairQuotes.updatedAt)).limit(50),
      db.select({ message: repairJobMessages, job: repairJobs })
        .from(repairJobMessages).innerJoin(repairJobs, eq(repairJobs.id, repairJobMessages.jobId))
        .where(and(eq(repairJobMessages.threadEngineerId, userId), eq(repairJobMessages.senderRole, "customer")))
        .orderBy(desc(repairJobMessages.createdAt)).limit(50),
      db.select({ message: repairJobMessages, job: repairJobs })
        .from(repairJobMessages).innerJoin(repairJobs, eq(repairJobs.id, repairJobMessages.jobId))
        .where(and(eq(repairJobs.customerId, userId), eq(repairJobMessages.senderRole, "engineer")))
        .orderBy(desc(repairJobMessages.createdAt)).limit(50),
    ]);
    const notifications = [
      ...customerQuotes.filter(({ quote }) => quote.status === "pending" || quote.status === "pending_payment").map(({ quote, job, engineerName }) => ({
        id: `quote:${quote.id}`, type: "new_quote", title: "New quote received",
        body: `${engineerName} sent a quote for ${job.title}.`, createdAt: quote.createdAt.toISOString(),
        jobId: job.id, href: `/marketplace?job=${encodeURIComponent(job.id)}`,
      })),
      ...customerJobs.filter((job) => job.status === "pending_payment").map((job) => ({
        id: `payment-pending:${job.id}`, type: "payment_pending", title: "Payment pending",
        body: `Payment is still pending for ${job.title}.`, createdAt: job.updatedAt.toISOString(),
        jobId: job.id, href: `/marketplace?job=${encodeURIComponent(job.id)}`,
      })),
      ...customerJobs.filter((job) => job.status === "accepted").map((job) => ({
        id: `payment-accepted:${job.id}`, type: "payment_accepted", title: "Payment accepted",
        body: `Your payment for ${job.title} was accepted.`, createdAt: job.updatedAt.toISOString(),
        jobId: job.id, href: `/marketplace?job=${encodeURIComponent(job.id)}`,
      })),
      ...engineerQuotes.filter(({ quote }) => quote.status === "pending_payment" || quote.status === "accepted").map(({ quote, job }) => ({
        id: `assignment:${quote.id}`, type: quote.status === "accepted" ? "assignment_accepted" : "assignment_pending",
        title: quote.status === "accepted" ? "Assignment accepted" : "Assignment pending",
        body: quote.status === "accepted" ? `You were selected for ${job.title}.` : `Your quote for ${job.title} is awaiting payment.`,
        createdAt: quote.updatedAt.toISOString(), jobId: job.id, href: `/marketplace?job=${encodeURIComponent(job.id)}`,
      })),
      ...engineerMessages.map(({ message, job }) => ({
        id: `message:${message.id}`, type: "customer_message", title: "New customer message",
        body: `You have a new message about ${job.title}.`, createdAt: message.createdAt.toISOString(), jobId: job.id,
        href: `/marketplace?job=${encodeURIComponent(job.id)}`,
      })),
      ...customerMessages.map(({ message, job }) => ({
        id: `message:${message.id}`, type: "engineer_message", title: "New engineer message",
        body: `You have a new message about ${job.title}.`, createdAt: message.createdAt.toISOString(), jobId: job.id,
        href: `/marketplace?job=${encodeURIComponent(job.id)}`,
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
    res.json(ListNotificationsResponse.parse(notifications));
  } catch (error) {
    req.log.error({ err: error }, "Unable to load notifications");
    res.status(500).json({ error: "Notifications could not be loaded." });
  }
});

export default router;