export interface AiGenerateRequest {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Thrown by an AiProvider when it cannot run at all because required
 * configuration (e.g. an API key) is missing — as opposed to a request-time
 * failure (network error, timeout, non-2xx response). Kept provider-specific
 * (what "configured" means depends on the provider) but typed generically so
 * the orchestrator (service.ts) can report a clear PROVIDER_NOT_CONFIGURED
 * error without knowing which env var any given provider needs.
 */
export class AiProviderNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderNotConfiguredError";
  }
}

/**
 * The entire contract an AI backend must satisfy: take a system/user prompt
 * pair, return the model's raw text response. Everything else in this module
 * (prompt construction, JSON extraction, schema validation, safety
 * filtering) is provider-agnostic and sits on top of this single method.
 *
 * Swapping providers — Groq for OpenAI, a self-hosted model, etc. — means
 * writing one new class that implements this interface and updating
 * providers/index.ts. Nothing else in the module changes.
 */
export interface AiProvider {
  generate(request: AiGenerateRequest): Promise<string>;
}
