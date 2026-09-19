import { describe, expect, it, vi } from "vitest";
import { AiProviderNotConfiguredError, type AiProvider } from "../../src/services/ai/provider";
import { assembleAndValidate, createAiService } from "../../src/services/ai/service";

const validRawJson = JSON.stringify({
  summary: "Patient reported a persistent cough and mild fatigue.",
  reportedConcerns: [
    { text: "Cough for 3 days", sourceType: "PATIENT_REPORTED" },
    { text: "CHW observed patient appeared tired", sourceType: "CHW_RECORDED" },
  ],
  missingInformation: ["No temperature recorded", "Duration of fatigue not mentioned"],
  suggestedFollowUps: ["Re-visit in 3 days if symptoms persist"],
});

function fakeProvider(impl: AiProvider["generate"]): AiProvider {
  return { generate: impl };
}

describe("assembleAndValidate", () => {
  it("returns a typed success with stamped source attribution", () => {
    const result = assembleAndValidate(validRawJson, { model: "test-model" });
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.summary.sourceType).toBe("AI_SUGGESTED");
    expect(result.data.reportedConcerns).toEqual([
      { text: "Cough for 3 days", sourceType: "PATIENT_REPORTED" },
      { text: "CHW observed patient appeared tired", sourceType: "CHW_RECORDED" },
    ]);
    // missingInformation/suggestedFollowUps are always stamped AI_SUGGESTED,
    // regardless of what the model was asked for (see schemas.ts) — assert
    // that guarantee explicitly.
    expect(result.data.missingInformation.every((i) => i.sourceType === "AI_SUGGESTED")).toBe(
      true,
    );
    expect(result.data.suggestedFollowUps.every((i) => i.sourceType === "AI_SUGGESTED")).toBe(
      true,
    );
    expect(result.data.safety.disclaimer.length).toBeGreaterThan(0);
    expect(result.data.meta.model).toBe("test-model");
  });

  it("handles a response wrapped in a markdown code fence", () => {
    const result = assembleAndValidate("```json\n" + validRawJson + "\n```", {
      model: "test-model",
    });
    expect(result.success).toBe(true);
  });

  it("returns PARSE_FAILED for unparseable text", () => {
    const result = assembleAndValidate("I cannot help with that.", { model: "test-model" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("PARSE_FAILED");
  });

  it("returns VALIDATION_FAILED when required fields are missing", () => {
    const result = assembleAndValidate(JSON.stringify({ summary: "x" }), { model: "test-model" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns UNSAFE_CONTENT_BLOCKED when the summary contains diagnostic language", () => {
    const unsafe = JSON.stringify({
      summary: "Diagnosis: malaria. Prescribe 10 mg daily.",
      reportedConcerns: [],
      missingInformation: [],
      suggestedFollowUps: [],
    });
    const result = assembleAndValidate(unsafe, { model: "test-model" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("UNSAFE_CONTENT_BLOCKED");
    expect(result.error.details).toEqual(
      expect.arrayContaining(["diagnostic_language", "prescriptive_language"]),
    );
  });

  it("returns UNSAFE_CONTENT_BLOCKED when a suggested follow-up recommends medication", () => {
    const unsafe = JSON.stringify({
      summary: "Patient reported headache.",
      reportedConcerns: [{ text: "Headache", sourceType: "PATIENT_REPORTED" }],
      missingInformation: [],
      suggestedFollowUps: ["Give 500 mg paracetamol twice daily"],
    });
    const result = assembleAndValidate(unsafe, { model: "test-model" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("UNSAFE_CONTENT_BLOCKED");
  });

  it("does not screen reportedConcerns against the safety filter", () => {
    // A transcript can legitimately mention medication a patient already
    // takes ("CHW recorded patient is currently on 500 mg metformin daily")
    // — that is faithful documentation, not an AI-invented prescription, and
    // must not be blocked.
    const raw = JSON.stringify({
      summary: "Routine follow-up visit.",
      reportedConcerns: [
        { text: "Patient currently takes 500 mg metformin daily", sourceType: "CHW_RECORDED" },
      ],
      missingInformation: [],
      suggestedFollowUps: [],
    });
    const result = assembleAndValidate(raw, { model: "test-model" });
    expect(result.success).toBe(true);
  });
});

describe("createAiService(provider).processVisit", () => {
  it("returns EMPTY_TRANSCRIPT without calling the provider", async () => {
    const generate = vi.fn();
    const { processVisit: run } = createAiService(fakeProvider(generate));

    const result = await run({ transcript: "   " });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("EMPTY_TRANSCRIPT");
    expect(generate).not.toHaveBeenCalled();
  });

  it("returns a validated success result from a well-behaved provider", async () => {
    const { processVisit: run } = createAiService(fakeProvider(async () => validRawJson));

    const result = await run({ transcript: "Patient reports a cough." });

    expect(result.success).toBe(true);
  });

  it("passes patient context and transcript into the prompt sent to the provider", async () => {
    const generate = vi.fn().mockResolvedValue(validRawJson);
    const { processVisit: run } = createAiService(fakeProvider(generate));

    await run({
      transcript: "Patient reports a cough.",
      patientContext: { ageYears: 34, gender: "female" },
    });

    expect(generate).toHaveBeenCalledTimes(1);
    const call = generate.mock.calls[0][0] as { systemPrompt: string; userPrompt: string };
    expect(call.userPrompt).toContain("Patient reports a cough.");
    expect(call.userPrompt).toContain("34");
    expect(call.userPrompt).toContain("female");
  });

  it("returns PROVIDER_TIMEOUT when the provider aborts", async () => {
    const { processVisit: run } = createAiService(
      fakeProvider(async () => {
        const err = new Error("The operation was aborted");
        err.name = "AbortError";
        throw err;
      }),
    );

    const result = await run({ transcript: "Patient reports a cough." });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("PROVIDER_TIMEOUT");
  });

  it("returns PROVIDER_ERROR when the provider throws a generic error", async () => {
    const { processVisit: run } = createAiService(
      fakeProvider(async () => {
        throw new Error("network unreachable");
      }),
    );

    const result = await run({ transcript: "Patient reports a cough." });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("PROVIDER_ERROR");
  });

  it("returns PROVIDER_NOT_CONFIGURED when the provider signals missing configuration", async () => {
    // Exercises the AiProviderNotConfiguredError path via dependency
    // injection rather than the real Groq provider + ambient environment —
    // GROQ_API_KEY may or may not be set in a developer's local .env, so
    // this must not depend on that.
    const { processVisit: run } = createAiService(
      fakeProvider(async () => {
        throw new AiProviderNotConfiguredError("GROQ_API_KEY is not configured.");
      }),
    );

    const result = await run({ transcript: "Patient reports a cough." });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("PROVIDER_NOT_CONFIGURED");
  });
});
