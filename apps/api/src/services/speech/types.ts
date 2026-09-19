/**
 * Public types for the speech-to-text module.
 *
 * The Visit service (not yet implemented) is the intended caller. It should
 * depend only on these types plus `transcribeAudio` from `./index`, not on
 * any internal file in this folder — that keeps the provider swappable and
 * the module testable as a unit. Intentionally isolated from
 * `services/ai` — this module only turns audio into text; it hands that
 * text to `processVisit()` and stops there.
 */

export interface TranscribeAudioInput {
  /** Raw audio bytes, buffered in memory — this module never writes audio to disk or a DB (see service.ts). */
  audio: Buffer;
  /** Original upload filename, used only to help detect the format — never forwarded to the provider as-is (see validation.ts). */
  filename: string;
  /** Browser/mobile-supplied content type, e.g. "audio/webm". */
  mimeType: string;
  /** Optional ISO-639-1 language hint (e.g. from the app's locale). Never guessed by this module — passed through only if the caller already knows it. */
  languageHint?: string;
}

export interface Transcription {
  text: string;
}

export type SttErrorCode =
  | "MISSING_AUDIO"
  | "UNSUPPORTED_FORMAT"
  | "FILE_TOO_LARGE"
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_ERROR"
  | "PROVIDER_TIMEOUT"
  | "EMPTY_TRANSCRIPTION";

export interface SttProcessingError {
  code: SttErrorCode;
  message: string;
  details?: unknown;
}

/**
 * Discriminated union returned by transcribeAudio(). Expected failure modes
 * (bad upload, provider down, empty result) are returned as typed values,
 * never thrown — the caller (eventually the Visit service) decides what to
 * do, e.g. surface the error to the CHW and let them type the visit
 * manually instead of recording it.
 */
export type TranscriptionResult =
  | { success: true; data: Transcription }
  | { success: false; error: SttProcessingError };
