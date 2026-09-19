import type { AiProvider } from "../provider";
import { GroqProvider } from "./groq-provider";

/**
 * Swap point for the AI backend. Today this always returns the Groq
 * integration; a future provider (OpenAI, a self-hosted model, ...) plugs in
 * here without any change to prompt.ts, schemas.ts, safety.ts, or service.ts.
 */
export function createAiProvider(): AiProvider {
  return new GroqProvider();
}
