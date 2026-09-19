import type { SttProvider } from "../provider";
import { GroqSttProvider } from "./groq-provider";

/**
 * Swap point for the STT backend. Today this always returns the Groq
 * (Whisper) integration; a future provider plugs in here without any change
 * to validation.ts or service.ts.
 */
export function createSttProvider(): SttProvider {
  return new GroqSttProvider();
}
