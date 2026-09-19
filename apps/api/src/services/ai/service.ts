import { logger } from "../../lib/logger";
import { aiConfig } from "./config";
import { extractJson } from "./json-extract";
import { buildPrompt } from "./prompt";
import { createAiProvider } from "./providers";
import { AiProviderNotConfiguredError, type AiProvider } from "./provider";
import { careNestAiResultSchema, processVisitInputSchema, rawAiOutputSchema } from "./schemas";
import { SAFETY_DISCLAIMER, scanForUnsafeLanguage } from "./safety";
import type { CareNestAiResult, ProcessVisitInput, ProcessVisitResult } from "./types";

/**
 * Upper bound on transcript length accepted by processVisit(), in
 * characters. A CHW field visit transcript is realistically a few thousand
 * characters at most; 20,000 (~3,500-4,000 words) is generous headroom
 * while still bounding provider token cost/latency and rejecting obviously
 * wrong input (e.g. a whole document pasted in by mistake) before it ever
 * reaches the network.
 */
export const MAX_TRANSCRIPT_LENGTH = 20_000;

function issueDetails(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));
}

/**
 * Pure assembly/validation/safety pipeline — no I/O, no provider call.
 * Takes the raw text a provider returned and produces a typed, validated
 * CareNestAiResult or a typed failure.
 *
 * Exported separately from processVisit so the parsing, validation, and
 * safety-filter logic — the part of this module with real behavior to get
 * wrong — can be unit tested directly with hand-written strings, without a
 * live or mocked network call.
 */
export function assembleAndValidate(rawText: string, meta: { model: string }): ProcessVisitResult {
  const parsedJson = extractJson(rawText);
  if (parsedJson === null) {
    return {
      success: false,
      error: { code: "PARSE_FAILED", message: "AI response could not be parsed as JSON." },
    };
  }

  const rawResult = rawAiOutputSchema.safeParse(parsedJson);
  if (!rawResult.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "AI response did not match the expected shape.",
        details: issueDetails(rawResult.error.issues),
      },
    };
  }

  const raw = rawResult.data;

  const assembled: CareNestAiResult = {
    // AI_SUGGESTED is stamped here in code, never trusted from the model —
    // see schemas.ts for why missingInformation/suggestedFollowUps only ask
    // the model for plain strings.
    summary: { text: raw.summary, sourceType: "AI_SUGGESTED" },
    reportedConcerns: raw.reportedConcerns.map((item) => ({
      text: item.text,
      sourceType: item.sourceType,
    })),
    missingInformation: raw.missingInformation.map((text) => ({
      text,
      sourceType: "AI_SUGGESTED" as const,
    })),
    suggestedFollowUps: raw.suggestedFollowUps.map((text) => ({
      text,
      sourceType: "AI_SUGGESTED" as const,
    })),
    safety: { disclaimer: SAFETY_DISCLAIMER, flags: [] },
    meta: { model: meta.model, generatedAt: new Date().toISOString() },
  };

  const violations = new Set<string>();
  const authoredText = [
    assembled.summary.text,
    ...assembled.missingInformation.map((item) => item.text),
    ...assembled.suggestedFollowUps.map((item) => item.text),
  ];
  for (const text of authoredText) {
    for (const category of scanForUnsafeLanguage(text)) {
      violations.add(category);
    }
  }

  if (violations.size > 0) {
    return {
      success: false,
      error: {
        code: "UNSAFE_CONTENT_BLOCKED",
        message: "AI output was blocked by the safety filter and was not returned.",
        details: [...violations],
      },
    };
  }

  // Final gate: re-validate the assembled object against the full result
  // schema (including the source-attribution refinements). This should be
  // unreachable given the assembly above — it guards against the assembly
  // logic and the schema silently drifting apart after a future edit.
  const finalCheck = careNestAiResultSchema.safeParse(assembled);
  if (!finalCheck.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Assembled AI result failed final validation.",
        details: issueDetails(finalCheck.error.issues),
      },
    };
  }

  return { success: true, data: finalCheck.data };
}

/**
 * Builds a processVisit function against a given provider. The default
 * export below wires this to the real Groq provider; tests (and, later, a
 * different AI backend) call this directly with a fake or alternate
 * provider instead of touching the network.
 */
export function createAiService(provider: AiProvider): {
  processVisit: (input: ProcessVisitInput) => Promise<ProcessVisitResult>;
} {
  async function processVisit(input: ProcessVisitInput): Promise<ProcessVisitResult> {
    // Validate the shape of the input itself before touching its contents —
    // catches a malformed/garbage patientContext or unexpected extra fields
    // (e.g. a caller mistakenly forwarding something like organizationId)
    // with a clear, typed error instead of silently feeding bad data into
    // the prompt.
    const parsedInput = processVisitInputSchema.safeParse(input);
    if (!parsedInput.success) {
      return {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "processVisit input did not match the expected shape.",
          details: issueDetails(parsedInput.error.issues),
        },
      };
    }

    const transcript = parsedInput.data.transcript.trim();
    if (!transcript) {
      return {
        success: false,
        error: { code: "EMPTY_TRANSCRIPT", message: "Transcript is empty; nothing to structure." },
      };
    }
    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      return {
        success: false,
        error: {
          code: "TRANSCRIPT_TOO_LONG",
          message: `Transcript exceeds the maximum allowed length of ${MAX_TRANSCRIPT_LENGTH} characters.`,
        },
      };
    }

    const { system, user } = buildPrompt({ transcript, patientContext: parsedInput.data.patientContext });

    let rawText: string;
    try {
      rawText = await provider.generate({ systemPrompt: system, userPrompt: user });
    } catch (err) {
      if (err instanceof AiProviderNotConfiguredError) {
        logger.warn("AI provider is not configured");
        return { success: false, error: { code: "PROVIDER_NOT_CONFIGURED", message: err.message } };
      }
      const timedOut = err instanceof Error && err.name === "AbortError";
      logger.warn({ err: err instanceof Error ? err.message : err }, "AI provider request failed");
      return {
        success: false,
        error: {
          code: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR",
          message: timedOut ? "AI provider request timed out." : "AI provider request failed.",
        },
      };
    }

    const result = assembleAndValidate(rawText, { model: aiConfig.model });
    if (!result.success) {
      logger.warn({ code: result.error.code }, "AI response rejected by validation/safety pipeline");
    }
    return result;
  }

  return { processVisit };
}

/** Default service instance, wired to the real Groq provider. */
export const { processVisit } = createAiService(createAiProvider());
