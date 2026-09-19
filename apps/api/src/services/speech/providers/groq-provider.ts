import { sttConfig } from "../config";
import {
  SttProviderNotConfiguredError,
  type AudioTranscribeRequest,
  type SttProvider,
} from "../provider";

interface GroqTranscriptionResponse {
  text?: string;
}

/**
 * Real integration with Groq's Whisper speech-to-text API
 * (console.groq.com/docs/speech-to-text). Requires GROQ_API_KEY — the same
 * key used by services/ai's Groq chat integration.
 *
 * Uses the platform's built-in fetch/FormData/Blob/AbortController
 * (Node 20+) — no HTTP client or form-data dependency needed. `response_format:
 * "json"` is used deliberately (returns only `{ text }`) rather than
 * `verbose_json` (which also returns segments/timestamps) — this module
 * only needs the transcript text.
 */
export class GroqSttProvider implements SttProvider {
  async transcribe({ audio, filename, mimeType, language }: AudioTranscribeRequest): Promise<string> {
    if (!sttConfig.apiKey) {
      throw new SttProviderNotConfiguredError(
        "GROQ_API_KEY is not configured. Set it in apps/api/.env to enable speech-to-text.",
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), sttConfig.requestTimeoutMs);

    try {
      const form = new FormData();
      form.append("file", new Blob([audio], { type: mimeType }), filename);
      form.append("model", sttConfig.model);
      form.append("response_format", "json");
      if (language) {
        form.append("language", language);
      }

      const response = await fetch(sttConfig.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sttConfig.apiKey}`,
          // No Content-Type header: fetch sets the multipart boundary
          // automatically from the FormData body. Setting it manually
          // breaks the boundary and the upload.
        },
        body: form,
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Groq speech-to-text API responded with ${response.status}: ${body.slice(0, 300)}`);
      }

      const json = (await response.json()) as GroqTranscriptionResponse;
      if (typeof json.text !== "string") {
        throw new Error("Groq speech-to-text API response did not include transcription text");
      }
      return json.text;
    } finally {
      clearTimeout(timeout);
    }
  }
}
