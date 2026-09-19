import { aiConfig } from "../config";
import { AiProviderNotConfiguredError, type AiGenerateRequest, type AiProvider } from "../provider";

interface GroqChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * Real integration with Groq's OpenAI-compatible chat completions API.
 * Requires GROQ_API_KEY (see apps/api/.env.example). Uses Groq's JSON mode
 * (response_format: json_object) so the model is far more likely to return
 * well-formed JSON — json-extract.ts still defends against a model that
 * ignores this and wraps its answer in prose or markdown anyway.
 *
 * Uses the platform's built-in fetch/AbortController (Node 20+) — no HTTP
 * client dependency needed.
 */
export class GroqProvider implements AiProvider {
  async generate({ systemPrompt, userPrompt }: AiGenerateRequest): Promise<string> {
    if (!aiConfig.apiKey) {
      throw new AiProviderNotConfiguredError(
        "GROQ_API_KEY is not configured. Set it in apps/api/.env to enable AI structuring.",
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), aiConfig.requestTimeoutMs);

    try {
      const response = await fetch(aiConfig.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: aiConfig.model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Groq API responded with ${response.status}: ${body.slice(0, 300)}`);
      }

      const json = (await response.json()) as GroqChatCompletionResponse;
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Groq API response did not include message content");
      }
      return content;
    } finally {
      clearTimeout(timeout);
    }
  }
}
