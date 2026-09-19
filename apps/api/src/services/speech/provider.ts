export interface AudioTranscribeRequest {
  audio: Buffer;
  /** Normalized filename (e.g. "audio.webm") — never the caller's original filename; see validation.ts. */
  filename: string;
  mimeType: string;
  language?: string;
}

/**
 * Thrown by an SttProvider when it cannot run at all because required
 * configuration (e.g. an API key) is missing — as opposed to a request-time
 * failure (network error, timeout, non-2xx response). Kept provider-specific
 * (what "configured" means depends on the provider) but typed generically so
 * the orchestrator (service.ts) can report a clear PROVIDER_NOT_CONFIGURED
 * error without knowing which env var any given provider needs.
 */
export class SttProviderNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SttProviderNotConfiguredError";
  }
}

/**
 * The entire contract an STT backend must satisfy: take audio bytes, return
 * the transcribed text. Everything else in this module (format validation,
 * size limits, error mapping) is provider-agnostic and sits on top of this
 * single method.
 *
 * Swapping providers — Groq for a different Whisper host, a different
 * speech API entirely — means writing one new class that implements this
 * interface and updating providers/index.ts. Nothing else in the module
 * changes.
 */
export interface SttProvider {
  transcribe(request: AudioTranscribeRequest): Promise<string>;
}
