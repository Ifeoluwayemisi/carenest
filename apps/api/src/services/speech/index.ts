/**
 * Public entry point of the speech-to-text module.
 *
 * Pipeline this module is one stage of:
 *
 *   audio → transcribeAudio() → transcript → processVisit() (services/ai)
 *
 * The Visit service (not yet implemented) should import only from this
 * file, not from internal files in this folder — that keeps the STT
 * provider swappable and this module testable as a self-contained unit.
 *
 * Typical usage from the future Visit service:
 *
 *   import { transcribeAudio } from "../services/speech";
 *   import { processVisit } from "../services/ai";
 *
 *   const stt = await transcribeAudio({ audio, filename, mimeType });
 *   if (!stt.success) {
 *     // stt.error.code: SttErrorCode — surface to the CHW, let them type
 *     // the visit manually instead of recording it. Never throws for
 *     // expected failure modes.
 *     return;
 *   }
 *
 *   const ai = await processVisit({ transcript: stt.data.text, patientContext });
 */
export { createSttService, transcribeAudio } from "./service";
export { createSttProvider } from "./providers";
export { SttProviderNotConfiguredError } from "./provider";
export type { AudioTranscribeRequest, SttProvider } from "./provider";
export { ACCEPTED_AUDIO_EXTENSIONS, resolveAudioExtension, validateAudioInput } from "./validation";
export type { AudioValidation } from "./validation";
export type {
  SttErrorCode,
  SttProcessingError,
  Transcription,
  TranscribeAudioInput,
  TranscriptionResult,
} from "./types";

import { ACCEPTED_AUDIO_EXTENSIONS } from "./validation";
import { sttConfig } from "./config";

/**
 * Read-only upload limits, exposed so the future Visit route/controller can
 * configure its multipart upload handler (e.g. Fastify's `limits.fileSize`)
 * consistently with what this module will actually accept, instead of the
 * two drifting apart. Deliberately narrow — never exposes the full
 * sttConfig object (which also holds the API key).
 */
export const STT_LIMITS = {
  maxAudioBytes: sttConfig.maxAudioBytes,
  acceptedExtensions: ACCEPTED_AUDIO_EXTENSIONS,
};
