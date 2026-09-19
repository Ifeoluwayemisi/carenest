import { logger } from "../../lib/logger";
import { sttConfig } from "./config";
import { createSttProvider } from "./providers";
import { SttProviderNotConfiguredError, type SttProvider } from "./provider";
import { validateAudioInput } from "./validation";
import type { TranscribeAudioInput, TranscriptionResult } from "./types";

/**
 * Builds a transcribeAudio function against a given provider. The default
 * export below wires this to the real Groq provider; tests (and, later, a
 * different STT backend) call this directly with a fake or alternate
 * provider instead of touching the network.
 */
export function createSttService(provider: SttProvider): {
  transcribeAudio: (input: TranscribeAudioInput) => Promise<TranscriptionResult>;
} {
  async function transcribeAudio(input: TranscribeAudioInput): Promise<TranscriptionResult> {
    const validation = validateAudioInput(input, sttConfig.maxAudioBytes);
    if (!validation.ok) {
      return { success: false, error: validation.error };
    }

    // Never forward the caller's original filename to the provider — on a
    // field device it can carry patient-identifying text (e.g. a CHW saving
    // "jane-doe-visit.m4a"). Only a normalized, content-typed filename
    // ("audio.<ext>") is ever sent.
    const normalizedFilename = `audio.${validation.extension}`;

    let rawText: string;
    try {
      rawText = await provider.transcribe({
        audio: input.audio,
        filename: normalizedFilename,
        mimeType: input.mimeType,
        language: input.languageHint,
      });
    } catch (err) {
      if (err instanceof SttProviderNotConfiguredError) {
        logger.warn("STT provider is not configured");
        return { success: false, error: { code: "PROVIDER_NOT_CONFIGURED", message: err.message } };
      }
      const timedOut = err instanceof Error && err.name === "AbortError";
      // Never log audio bytes or transcript content here — only the error
      // shape (message/code), matching the "never log raw audio or
      // transcripts" requirement.
      logger.warn({ err: err instanceof Error ? err.message : err }, "STT provider request failed");
      return {
        success: false,
        error: {
          code: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR",
          message: timedOut ? "Speech-to-text request timed out." : "Speech-to-text request failed.",
        },
      };
    }

    const text = rawText.trim();
    if (!text) {
      return {
        success: false,
        error: { code: "EMPTY_TRANSCRIPTION", message: "No speech was detected in the audio." },
      };
    }

    return { success: true, data: { text } };
  }

  return { transcribeAudio };
}

/** Default service instance, wired to the real Groq provider. */
export const { transcribeAudio } = createSttService(createSttProvider());
