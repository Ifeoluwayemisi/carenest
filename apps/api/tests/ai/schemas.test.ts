import { describe, expect, it } from "vitest";
import { careNestAiResultSchema, rawAiOutputSchema } from "../../src/services/ai/schemas";

const validRaw = {
  summary: "Patient reported a persistent cough.",
  reportedConcerns: [{ text: "Cough for 3 days", sourceType: "PATIENT_REPORTED" }],
  missingInformation: ["No temperature recorded"],
  suggestedFollowUps: ["Re-visit in 3 days if symptoms persist"],
};

function validResult() {
  return {
    summary: { text: "Patient reported a persistent cough.", sourceType: "AI_SUGGESTED" },
    reportedConcerns: [{ text: "Cough for 3 days", sourceType: "PATIENT_REPORTED" }],
    missingInformation: [{ text: "No temperature recorded", sourceType: "AI_SUGGESTED" }],
    suggestedFollowUps: [{ text: "Re-visit in 3 days", sourceType: "AI_SUGGESTED" }],
    safety: { disclaimer: "This is an AI draft.", flags: [] },
    meta: { model: "test-model", generatedAt: new Date().toISOString() },
  };
}

describe("rawAiOutputSchema", () => {
  it("accepts a valid raw AI output shape", () => {
    expect(rawAiOutputSchema.safeParse(validRaw).success).toBe(true);
  });

  it("rejects a missing required field", () => {
    const withoutSummary = {
      reportedConcerns: validRaw.reportedConcerns,
      missingInformation: validRaw.missingInformation,
      suggestedFollowUps: validRaw.suggestedFollowUps,
    };
    expect(rawAiOutputSchema.safeParse(withoutSummary).success).toBe(false);
  });

  it("rejects an empty summary", () => {
    expect(rawAiOutputSchema.safeParse({ ...validRaw, summary: "" }).success).toBe(false);
  });

  it("rejects a reportedConcerns sourceType outside PATIENT_REPORTED/CHW_RECORDED", () => {
    const result = rawAiOutputSchema.safeParse({
      ...validRaw,
      reportedConcerns: [{ text: "x", sourceType: "AI_SUGGESTED" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 items in a list", () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => `item ${i}`);
    expect(rawAiOutputSchema.safeParse({ ...validRaw, missingInformation: tooMany }).success).toBe(
      false,
    );
  });

  it("rejects an overlong string", () => {
    expect(
      rawAiOutputSchema.safeParse({ ...validRaw, summary: "x".repeat(2001) }).success,
    ).toBe(false);
  });
});

describe("careNestAiResultSchema", () => {
  it("accepts a fully assembled, correctly attributed result", () => {
    expect(careNestAiResultSchema.safeParse(validResult()).success).toBe(true);
  });

  it("rejects a reportedConcerns entry tagged AI_SUGGESTED (invented concern)", () => {
    const bad = validResult();
    bad.reportedConcerns = [{ text: "Fabricated concern", sourceType: "AI_SUGGESTED" }];
    expect(careNestAiResultSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a missingInformation entry tagged PATIENT_REPORTED", () => {
    const bad = validResult();
    bad.missingInformation = [{ text: "x", sourceType: "PATIENT_REPORTED" }];
    expect(careNestAiResultSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a suggestedFollowUps entry tagged CHW_RECORDED", () => {
    const bad = validResult();
    bad.suggestedFollowUps = [{ text: "x", sourceType: "CHW_RECORDED" }];
    expect(careNestAiResultSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a summary not tagged AI_SUGGESTED", () => {
    const bad = validResult();
    bad.summary = { text: "x", sourceType: "PATIENT_REPORTED" };
    expect(careNestAiResultSchema.safeParse(bad).success).toBe(false);
  });
});
