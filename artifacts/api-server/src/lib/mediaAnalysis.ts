import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ObjectStorageService } from "./objectStorage";
import {
  ALLOWED_MEDIA,
  IMAGE_LIMIT,
  AUDIO_LIMIT,
  VIDEO_LIMIT,
  verifyUploadToken,
} from "../routes/storage";

const execFileAsync = promisify(execFile);
const storage = new ObjectStorageService();

export type MediaInput = {
  objectPath: string;
  uploadToken: string;
  name: string;
  contentType: string;
  size: number;
};

export type AnalysedMedia = {
  images: string[];
  transcript: string | null;
  audioEvidence: string[];
  audioData: string | null;
  audioFormat: "wav" | null;
  kind: "photo" | "video" | "audio";
};

function hasExpectedSignature(buffer: Buffer, contentType: string) {
  if (contentType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8;
  if (contentType === "image/png") return buffer.subarray(1, 4).toString() === "PNG";
  if (contentType === "image/webp") return buffer.subarray(8, 12).toString() === "WEBP";
  if (contentType === "video/webm") return buffer.subarray(0, 4).toString("hex") === "1a45dfa3";
  if (contentType === "video/mp4" || contentType === "video/quicktime") {
    return buffer.subarray(4, 8).toString() === "ftyp";
  }
  if (contentType === "audio/wav" || contentType === "audio/x-wav") {
    return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WAVE";
  }
  if (contentType === "audio/mpeg") {
    return buffer.subarray(0, 3).toString() === "ID3" || (buffer[0] === 0xff && (buffer[1]! & 0xe0) === 0xe0);
  }
  if (contentType === "audio/mp4" || contentType === "audio/m4a") {
    return buffer.subarray(4, 8).toString() === "ftyp";
  }
  if (contentType === "audio/webm") return buffer.subarray(0, 4).toString("hex") === "1a45dfa3";
  if (contentType === "audio/ogg") return buffer.subarray(0, 4).toString() === "OggS";
  return false;
}

async function extractAudioEvidence(input: string, duration: number): Promise<string[]> {
  try {
    const { stderr } = await execFileAsync("ffmpeg", [
      "-hide_banner",
      "-i",
      input,
      "-af",
      "volumedetect,silencedetect=noise=-35dB:d=0.2",
      "-f",
      "null",
      "-",
    ], { timeout: 20_000 });
    const mean = stderr.match(/mean_volume:\s*(-?[\d.]+)\s*dB/i)?.[1];
    const peak = stderr.match(/max_volume:\s*(-?[\d.]+)\s*dB/i)?.[1];
    const silenceDurations = [...stderr.matchAll(/silence_duration:\s*([\d.]+)/gi)]
      .map((match) => Number(match[1]))
      .filter(Number.isFinite);
    const silenceSeconds = silenceDurations.reduce((total, value) => total + value, 0);
    const observations = [`Recording duration: ${duration.toFixed(1)} seconds.`];
    if (mean) observations.push(`Average signal level: ${mean} dB.`);
    if (peak) observations.push(`Peak signal level: ${peak} dB.`);
    if (silenceDurations.length) {
      observations.push(`Approximately ${Math.min(100, Math.round((silenceSeconds / duration) * 100))}% of the clip was below the signal threshold.`);
    }
    return observations;
  } catch {
    return [`Recording duration: ${duration.toFixed(1)} seconds.`];
  }
}

export async function analyseMedia(
  media: MediaInput,
  userId: string,
): Promise<AnalysedMedia> {
  if (!ALLOWED_MEDIA.has(media.contentType)) {
    throw Object.assign(new Error("Unsupported media type."), { status: 415 });
  }
  const [encodedExpiry, token] = media.uploadToken.split(".", 2);
  let expiresAt = "";
  try {
    expiresAt = encodedExpiry
      ? Buffer.from(encodedExpiry, "base64url").toString("utf8")
      : "";
  } catch {
    expiresAt = "";
  }
  if (
    !expiresAt ||
    !token ||
    !verifyUploadToken(
      media.objectPath,
      media.contentType,
      media.size,
      expiresAt,
      token,
      userId,
    )
  ) {
    throw Object.assign(new Error("This upload has expired. Attach the file again."), {
      status: 400,
    });
  }

  const object = await storage.getObjectEntityFile(media.objectPath);
  const [metadata] = await object.getMetadata();
  const actualSize = Number(metadata.size ?? 0);
  const limit = media.contentType.startsWith("image/")
    ? IMAGE_LIMIT
    : media.contentType.startsWith("audio/")
      ? AUDIO_LIMIT
      : VIDEO_LIMIT;
  if (!actualSize || actualSize > limit || actualSize !== media.size) {
    await object.delete({ ignoreNotFound: true });
    throw Object.assign(new Error("The uploaded file size did not match the selected file."), {
      status: 413,
    });
  }
  const [buffer] = await object.download();
  if (!hasExpectedSignature(buffer, media.contentType)) {
    await object.delete({ ignoreNotFound: true });
    throw Object.assign(
      new Error("The file contents do not match its format. Try exporting it again."),
      { status: 415 },
    );
  }

  if (media.contentType.startsWith("image/")) {
    return {
      images: [`data:${media.contentType};base64,${buffer.toString("base64")}`],
      transcript: null,
      audioEvidence: [],
      audioData: null,
      audioFormat: null,
      kind: "photo",
    };
  }

  const directory = await mkdtemp(path.join(tmpdir(), "fixmate-"));
  const input = path.join(directory, "input");
    const audio = path.join(directory, "audio.wav");
  try {
    await writeFile(input, buffer);
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      input,
    ], { timeout: 15_000 });
    const duration = Number(stdout.trim());
    const isAudio = media.contentType.startsWith("audio/");
    const maxDuration = isAudio ? 15 : 30;
    if (!Number.isFinite(duration) || duration <= 0 || duration > maxDuration) {
      throw Object.assign(new Error(isAudio ? "Audio clips must be 15 seconds or shorter." : "Videos must be 30 seconds or shorter."), {
        status: 413,
      });
    }

    if (isAudio) {
      await execFileAsync("ffmpeg", [
        "-v", "error", "-i", input, "-vn", "-ac", "1", "-ar", "16000", "-f", "wav", audio,
      ], { timeout: 20_000 });
      const audioBytes = await readFile(audio);
      let transcript: string | null = null;
      try {
        const file = new File([audioBytes], "audio.wav", { type: "audio/wav" });
        const transcription = await openai.audio.transcriptions.create({
          model: "gpt-4o-mini-transcribe",
          file,
          response_format: "json",
        }, { timeout: 30_000 });
        transcript = transcription.text.trim() || null;
      } catch {
        transcript = null;
      }
      return {
        images: [],
        transcript,
        audioEvidence: await extractAudioEvidence(input, duration),
        audioData: audioBytes.toString("base64"),
        audioFormat: "wav",
        kind: "audio",
      };
    }

    const timestamps = Array.from(
      new Set(
        [0, duration / 3, (duration * 2) / 3, Math.max(0, duration - 0.1)].map(
          (value) => value.toFixed(2),
        ),
      ),
    );
    await Promise.all(
      timestamps.map((timestamp, index) =>
        execFileAsync("ffmpeg", [
          "-v",
          "error",
          "-ss",
          timestamp,
          "-i",
          input,
          "-frames:v",
          "1",
          "-vf",
          "scale='min(1024,iw)':-2",
          path.join(directory, `frame-${String(index).padStart(2, "0")}.jpg`),
        ], { timeout: 20_000 }),
      ),
    );
    const { readdir, readFile: readFileFromDisk } = await import("node:fs/promises");
    const frameNames = (await readdir(directory))
      .filter((name) => name.startsWith("frame-"))
      .sort();
    const images = await Promise.all(
      frameNames.map(async (name) =>
        `data:image/jpeg;base64,${(await readFileFromDisk(path.join(directory, name))).toString("base64")}`,
      ),
    );
    if (!images.length) {
      throw Object.assign(new Error("No readable picture frames were found in this video."), {
        status: 415,
      });
    }

    let transcript: string | null = null;
    let audioData: string | null = null;
    let audioEvidence: string[] = [];
    try {
      await execFileAsync("ffmpeg", [
        "-v",
        "error",
        "-i",
        input,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        audio,
      ], { timeout: 20_000 });
      const audioBytes = await readFile(audio);
      audioData = audioBytes.toString("base64");
      audioEvidence = await extractAudioEvidence(input, duration);
      const file = new File([audioBytes], "audio.wav", { type: "audio/wav" });
      const transcription = await openai.audio.transcriptions.create({
        model: "gpt-4o-mini-transcribe",
        file,
        response_format: "json",
      }, { timeout: 30_000 });
      transcript = transcription.text.trim() || null;
    } catch {
      transcript = null;
    }
    return { images, transcript, audioEvidence, audioData, audioFormat: audioData ? "wav" : null, kind: "video" };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}