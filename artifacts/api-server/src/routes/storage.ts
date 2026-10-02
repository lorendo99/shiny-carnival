import { createHmac, timingSafeEqual } from "node:crypto";
import { getAuth } from "@clerk/express";
import { Router, type IRouter, type RequestHandler } from "express";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService } from "../lib/objectStorage";
import { allowRequest } from "../lib/requestLimits";

const router: IRouter = Router();
const storage = new ObjectStorageService();

export const ALLOWED_MEDIA = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "application/pdf",
]);
export const IMAGE_LIMIT = 15 * 1024 * 1024;
export const VIDEO_LIMIT = 60 * 1024 * 1024;
export const AUDIO_LIMIT = 15 * 1024 * 1024;

function signingSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for upload authorization.");
  return secret;
}

function signature(payload: string) {
  return createHmac("sha256", signingSecret()).update(payload).digest("hex");
}

export function createUploadToken(
  objectPath: string,
  contentType: string,
  size: number,
  expiresAt: string,
  userId: string,
) {
  return signature(`${objectPath}|${contentType}|${size}|${expiresAt}|${userId}`);
}

export function verifyUploadToken(
  objectPath: string,
  contentType: string,
  size: number,
  expiresAt: string,
  token: string,
  userId: string,
) {
  if (Date.parse(expiresAt) < Date.now()) return false;
  const expected = Buffer.from(
    createUploadToken(objectPath, contentType, size, expiresAt, userId),
  );
  const supplied = Buffer.from(token);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

const requireAuth: RequestHandler = (req, res, next) => {
  if (!getAuth(req).userId) {
    res.status(401).json({ error: "Sign in to upload repair evidence." });
    return;
  }
  next();
};

router.post("/storage/uploads/request-url", requireAuth, async (req, res) => {
  if (!allowRequest(req, "upload-url", 12)) {
    res.status(429).json({
      error: "Too many uploads were started. Wait a little before trying again.",
    });
    return;
  }
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a valid photo or short video." });
    return;
  }

  const { name, size, contentType } = parsed.data;
  if (!ALLOWED_MEDIA.has(contentType)) {
    res.status(415).json({
      error: "Use a JPG, PNG, WebP, PDF, MP4, WebM, MOV, or short audio file.",
    });
    return;
  }

  const limit = contentType === "application/pdf"
    ? VIDEO_LIMIT
    : contentType.startsWith("image/")
    ? IMAGE_LIMIT
    : contentType.startsWith("audio/")
      ? AUDIO_LIMIT
      : VIDEO_LIMIT;
  if (size > limit) {
    res.status(413).json({
      error: contentType.startsWith("image/")
        ? "Photos must be 15 MB or smaller."
        : contentType.startsWith("audio/")
          ? "Audio clips must be 15 MB or smaller and no longer than 15 seconds."
        : "Videos and documents must be 60 MB or smaller.",
    });
    return;
  }

  try {
    const uploadURL = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL);
    const expiresAt = new Date(Date.now() + 20 * 60_000).toISOString();
    const uploadToken = createUploadToken(
      objectPath,
      contentType,
      size,
      expiresAt,
      getAuth(req).userId!,
    );
    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        uploadToken: `${Buffer.from(expiresAt).toString("base64url")}.${uploadToken}`,
        expiresAt,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Unable to create media upload URL");
    res.status(500).json({ error: "The upload could not start. Please try again." });
  }
});

export default router;