import { z } from "zod";
import { env } from "../../config/env";

/**
 * AI-module-specific configuration, layered on top of the shared `env`
 * (which already parses and owns GROQ_API_KEY). These extra knobs are kept
 * local to this module rather than added to config/env.ts so the AI layer
 * stays self-contained — adding or changing an AI-only setting never
 * requires touching shared foundation config.
 */
const aiEnvSchema = z.object({
  GROQ_MODEL: z.string().min(1).default("openai/gpt-oss-120b"),
  GROQ_API_BASE_URL: z.string().url().default("https://api.groq.com/openai/v1/chat/completions"),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
});

const parsed = aiEnvSchema.safeParse(process.env);

if (!parsed.success) {
  // This is a library module, not the process entrypoint (config/env.ts is
  // the entrypoint and calls process.exit(1) on bad config). Throwing here
  // instead lets the failure surface wherever the AI module is first used,
  // and lets tests assert against it without killing the test runner.
  throw new Error(
    `Invalid AI environment configuration: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
  );
}

export const aiConfig = {
  /** Undefined when GROQ_API_KEY is not set — callers must check before using a provider. */
  apiKey: env.GROQ_API_KEY,
  model: parsed.data.GROQ_MODEL,
  endpoint: parsed.data.GROQ_API_BASE_URL,
  requestTimeoutMs: parsed.data.AI_REQUEST_TIMEOUT_MS,
};
