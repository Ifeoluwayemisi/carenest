/**
 * Extracts a JSON object from a raw LLM text response.
 *
 * Even when explicitly asked for JSON-only output (and even with the
 * provider's JSON response mode enabled), models sometimes wrap the object
 * in a markdown code fence or add stray preamble/trailing text. This
 * recovers the object defensively instead of trusting the response to be
 * clean, trying progressively looser strategies and returning `null` only
 * if none of them parse.
 */
export function extractJson(rawText: string): unknown | null {
  if (!rawText || typeof rawText !== "string") {
    return null;
  }

  const candidates: string[] = [rawText.trim()];

  // Try every fenced code block, not just the first — a model occasionally
  // prefaces its real answer with an example/instructions block that also
  // happens to contain braces, and the first fence isn't always the one
  // with the actual result.
  for (const match of rawText.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    if (match[1]) {
      candidates.push(match[1].trim());
    }
  }

  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(rawText.slice(firstBrace, lastBrace + 1).trim());
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  return null;
}
