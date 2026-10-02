import type { Request } from "express";

const windows = new Map<string, { count: number; resetAt: number }>();

export function allowRequest(
  req: Request,
  scope: string,
  limit: number,
  windowMs = 60 * 60_000,
) {
  const now = Date.now();
  const key = `${scope}:${req.ip}`;
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

let activeMediaJobs = 0;
const MAX_MEDIA_JOBS = 2;

export function claimMediaJob() {
  if (activeMediaJobs >= MAX_MEDIA_JOBS) return false;
  activeMediaJobs += 1;
  return true;
}

export function releaseMediaJob() {
  activeMediaJobs = Math.max(0, activeMediaJobs - 1);
}