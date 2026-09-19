import { z } from "zod";
import { env } from "../../config/env";

/**
 * Speech-to-text-specific configuration, layered on top of the shared `env`
 * (which already parses and owns GROQ_API_KEY — the same Groq account key
 * used by services/ai). These extra knobs stay local to this module so it
 * remains self-contained; adding or changing an STT-only setting never
 * requires touching shared foundation config.
 */
const sttEnvSchema = z.object({
  GROQ_STT_MODEL: z.string().min(1).default("whisper-large-v3-turbo"),
  GROQ_STT_BASE_URL: z
    .string()
    .url()
    .default("https://api.groq.com/openai/v1/audio/transcriptions"),
  STT_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  // 25 MB matches Groq's free-tier upload limit (console.groq.com/docs/speech-to-text).
  // Raise it if the account is on a paid tier with a higher limit.
  STT_MAX_AUDIO_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024),
});

const parsed = sttEnvSchema.safeParse(process.env);

if (!parsed.success) {
  // A library module should not kill the whole process (config/env.ts is the
  // entrypoint and does that for the app). Throwing here lets the failure
  // surface wherever this module is first used, and lets tests assert
  // against it without killing the test runner.
  throw new Error(
    `Invalid STT environment configuration: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
  );
}

export const sttConfig = {
  /** Undefined when GROQ_API_KEY is not set — the provider checks before using it. */
  apiKey: env.GROQ_API_KEY,
  model: parsed.data.GROQ_STT_MODEL,
  endpoint: parsed.data.GROQ_STT_BASE_URL,
  requestTimeoutMs: parsed.data.STT_REQUEST_TIMEOUT_MS,
  maxAudioBytes: parsed.data.STT_MAX_AUDIO_BYTES,
};
