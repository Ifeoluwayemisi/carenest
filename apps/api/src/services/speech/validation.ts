import type { SttProcessingError, TranscribeAudioInput } from "./types";

/**
 * File extensions Groq's Whisper API accepts
 * (see console.groq.com/docs/speech-to-text).
 */
export const ACCEPTED_AUDIO_EXTENSIONS = [
  "flac",
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "m4a",
  "ogg",
  "wav",
  "webm",
] as const;

const ACCEPTED_EXTENSION_SET = new Set<string>(ACCEPTED_AUDIO_EXTENSIONS);

/**
 * Content types the browser/mobile MediaRecorder APIs most commonly send,
 * mapped to a canonical accepted extension. Covers Chrome/Android (webm),
 * Safari/iOS (mp4/m4a), and Firefox (ogg), plus common upload fallbacks.
 */
const MIME_TO_EXTENSION: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "application/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
};

function extensionFromFilename(filename: string): string | null {
  const match = /\.([a-z0-9]+)$/i.exec(filename.trim());
  return match ? match[1].toLowerCase() : null;
}

/**
 * Resolves a normalized, Groq-accepted file extension from the upload's
 * filename and/or content type. The filename extension wins when it's
 * already one Groq recognizes; otherwise falls back to the MIME type, which
 * browsers set reliably from MediaRecorder even when the filename is
 * generic or missing (common on mobile).
 */
export function resolveAudioExtension(filename: string, mimeType: string): string | null {
  const fromName = extensionFromFilename(filename ?? "");
  if (fromName && ACCEPTED_EXTENSION_SET.has(fromName)) {
    return fromName;
  }
  const normalizedMime = (mimeType ?? "").split(";")[0].trim().toLowerCase();
  return MIME_TO_EXTENSION[normalizedMime] ?? null;
}

export type AudioValidation = { ok: true; extension: string } | { ok: false; error: SttProcessingError };

/**
 * Validates an audio upload before any network call is made: non-empty,
 * within the configured size limit, and a recognized format. Kept separate
 * from the provider call so a bad upload never costs a Groq API request.
 */
export function validateAudioInput(input: TranscribeAudioInput, maxBytes: number): AudioValidation {
  if (!input.audio || input.audio.byteLength === 0) {
    return {
      ok: false,
      error: { code: "MISSING_AUDIO", message: "No audio data was provided." },
    };
  }

  if (input.audio.byteLength > maxBytes) {
    return {
      ok: false,
      error: {
        code: "FILE_TOO_LARGE",
        message: `Audio file exceeds the maximum allowed size of ${Math.floor(maxBytes / (1024 * 1024))} MB.`,
      },
    };
  }

  const extension = resolveAudioExtension(input.filename ?? "", input.mimeType ?? "");
  if (!extension) {
    return {
      ok: false,
      error: {
        code: "UNSUPPORTED_FORMAT",
        message: `Unsupported audio format. Accepted formats: ${ACCEPTED_AUDIO_EXTENSIONS.join(", ")}.`,
      },
    };
  }

  return { ok: true, extension };
}
