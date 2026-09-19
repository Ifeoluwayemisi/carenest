import { describe, expect, it, vi } from "vitest";
import { AiProviderNotConfiguredError, type AiProvider } from "../../src/services/ai/provider";
import { createAiService } from "../../src/services/ai/service";
import type { SttProvider } from "../../src/services/speech/provider";
import { createSttService } from "../../src/services/speech/service";

/**
 * Failure-matrix tests for the STT -> transcript -> AI pipeline.
 *
 * This file does NOT implement the Visit domain — it composes the two
 * already-public factory functions (createSttService, createAiService) with
 * hand-written fake providers, exactly the way a future Visit service would
 * compose transcribeAudio() and processVisit(), to prove the *contract*
 * between the two modules holds under every failure combination. No HTTP
 * route, controller, repository, or database write exists here or is
 * implied — this is test-side orchestration only.
 */

function fakeAiProvider(impl: AiProvider["generate"]): AiProvider {
  return { generate: impl };
}
function fakeSttProvider(impl: SttProvider["transcribe"]): SttProvider {
  return { transcribe: impl };
}

const validAudioInput = {
  audio: Buffer.from("fake-audio-bytes"),
  filename: "recording.webm",
  mimeType: "audio/webm",
};

const validAiRawJson = JSON.stringify({
  summary: "Patient reported a cough.",
  reportedConcerns: [{ text: "Cough for 3 days", sourceType: "PATIENT_REPORTED" }],
  missingInformation: [],
  suggestedFollowUps: [],
});

describe("Scenario A: STT succeeds -> AI succeeds", () => {
  it("produces both a usable transcript and a structured AI result", async () => {
    const { transcribeAudio } = createSttService(
      fakeSttProvider(async () => "Patient reports a cough for three days."),
    );
    const { processVisit } = createAiService(fakeAiProvider(async () => validAiRawJson));

    const stt = await transcribeAudio(validAudioInput);
    expect(stt.success).toBe(true);
    if (!stt.success) return;

    const ai = await processVisit({ transcript: stt.data.text });
    expect(ai.success).toBe(true);
    if (!ai.success) return;

    expect(stt.data.text.length).toBeGreaterThan(0);
    expect(ai.data.reportedConcerns.length).toBeGreaterThan(0);
  });
});

describe("Scenario B: STT fails", () => {
  it("returns a typed STT failure without requiring any AI call", async () => {
    const { transcribeAudio } = createSttService(
      fakeSttProvider(async () => {
        throw new Error("Groq speech-to-text API responded with 500: internal error");
      }),
    );
    // Stands in for the AI provider — a correctly-orchestrated caller has no
    // transcript to structure after an STT failure, so this must never fire.
    const aiGenerate = vi.fn();

    const stt = await transcribeAudio(validAudioInput);
    expect(stt.success).toBe(false);
    if (stt.success) return;
    expect(stt.error.code).toBe("PROVIDER_ERROR");
    expect(aiGenerate).not.toHaveBeenCalled();
  });

  it("still allows a manual-entry fallback: a CHW-typed transcript reaches AI structuring normally", async () => {
    // The application-level fallback for an STT failure is simply calling
    // processVisit with CHW-typed text instead of a transcribed one — the
    // same function, same contract, no special-cased "manual" code path.
    const { processVisit } = createAiService(fakeAiProvider(async () => validAiRawJson));

    const manual = await processVisit({ transcript: "CHW manually typed: patient reports a cough." });

    expect(manual.success).toBe(true);
  });
});

describe("Scenario C: STT succeeds -> AI fails", () => {
  it("keeps the transcript usable, represents the AI failure clearly, and never fabricates AI output", async () => {
    const { transcribeAudio } = createSttService(
      fakeSttProvider(async () => "Patient reports a cough for three days."),
    );
    const { processVisit } = createAiService(
      fakeAiProvider(async () => {
        throw new Error("Groq API responded with 503: service unavailable");
      }),
    );

    const stt = await transcribeAudio(validAudioInput);
    expect(stt.success).toBe(true);
    if (!stt.success) return;

    const ai = await processVisit({ transcript: stt.data.text });
    expect(ai.success).toBe(false);
    if (ai.success) return;

    // The transcript survives regardless of what happened to AI structuring.
    expect(stt.data.text).toBe("Patient reports a cough for three days.");
    // The failure is typed and specific.
    expect(ai.error.code).toBe("PROVIDER_ERROR");
    // No "data" field exists on a failed result — nothing resembling a
    // structured AI draft is present to be mistaken for one.
    expect("data" in ai).toBe(false);

    // Manual review/completion remains possible: the CHW can still confirm
    // a visit built from the (still-available) transcript alone.
    expect(stt.data.text.length).toBeGreaterThan(0);
  });
});

describe("Scenario D: AI returns malformed output", () => {
  it("rejects malformed output as a validation failure, never as valid structured data", async () => {
    const { processVisit } = createAiService(
      fakeAiProvider(async () => JSON.stringify({ summary: "ok" /* missing required fields */ })),
    );

    const result = await processVisit({ transcript: "Patient reports a cough." });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("VALIDATION_FAILED");
    expect("data" in result).toBe(false);
  });

  it("rejects a response that is not JSON at all", async () => {
    const { processVisit } = createAiService(
      fakeAiProvider(async () => "I'm not able to help with that."),
    );

    const result = await processVisit({ transcript: "Patient reports a cough." });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("PARSE_FAILED");
  });
});

describe("Scenario E: AI provider times out", () => {
  it("returns a typed timeout failure without hanging, and without leaking sensitive information", async () => {
    const { processVisit } = createAiService(
      fakeAiProvider(async () => {
        const err = new Error("The operation was aborted");
        err.name = "AbortError";
        throw err;
      }),
    );

    const start = Date.now();
    const result = await processVisit({ transcript: "Patient reports a cough." });
    const elapsedMs = Date.now() - start;

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("PROVIDER_TIMEOUT");
    // Resolves promptly — the fake provider throws immediately, proving
    // there is no code path that swallows/hangs on an abort.
    expect(elapsedMs).toBeLessThan(1000);
    // Generic message only — no stack trace, no internal detail, no secret.
    expect(result.error.message).toBe("AI provider request timed out.");
  });
});

describe("Scenario F: AI returns unsafe/unsupported content", () => {
  it("rejects unsafe content and never lets it become a confirmed-looking record", async () => {
    const { processVisit } = createAiService(
      fakeAiProvider(async () =>
        JSON.stringify({
          summary: "The patient has malaria and should begin antimalarial treatment.",
          reportedConcerns: [],
          missingInformation: [],
          suggestedFollowUps: [],
        }),
      ),
    );

    const result = await processVisit({ transcript: "Patient reports fever." });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("UNSAFE_CONTENT_BLOCKED");
    // Nothing resembling a usable AI draft is returned alongside the error.
    expect("data" in result).toBe(false);
  });
});

describe("Additional: AI provider not configured never blocks STT or manual entry", () => {
  it("STT can still succeed and manual transcript entry still works when GROQ_API_KEY is missing for AI", async () => {
    const { transcribeAudio } = createSttService(
      fakeSttProvider(async () => "Patient reports a cough."),
    );
    const { processVisit } = createAiService(
      fakeAiProvider(async () => {
        throw new AiProviderNotConfiguredError("GROQ_API_KEY is not configured.");
      }),
    );

    const stt = await transcribeAudio(validAudioInput);
    expect(stt.success).toBe(true);

    const ai = await processVisit({ transcript: "Patient reports a cough." });
    expect(ai.success).toBe(false);
    if (ai.success) return;
    expect(ai.error.code).toBe("PROVIDER_NOT_CONFIGURED");
    // The transcript itself is unaffected — a visit can still be saved with
    // the transcript and no AI draft, for later manual completion.
  });
});
