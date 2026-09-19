import { describe, expect, it } from "vitest";
import {
  careNestAiResultSchema,
  patientContextSchema,
  processVisitInputSchema,
  rawAiOutputSchema,
} from "../../src/services/ai/schemas";

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

  it("rejects incorrect field types", () => {
    expect(rawAiOutputSchema.safeParse({ ...validRaw, summary: 12345 }).success).toBe(false);
    expect(
      rawAiOutputSchema.safeParse({ ...validRaw, reportedConcerns: "not an array" }).success,
    ).toBe(false);
    expect(
      rawAiOutputSchema.safeParse({ ...validRaw, missingInformation: [123, 456] }).success,
    ).toBe(false);
  });

  it("rejects a whitespace-only summary", () => {
    expect(rawAiOutputSchema.safeParse({ ...validRaw, summary: "   " }).success).toBe(false);
  });

  it("rejects null/undefined in place of the whole object", () => {
    expect(rawAiOutputSchema.safeParse(null).success).toBe(false);
    expect(rawAiOutputSchema.safeParse(undefined).success).toBe(false);
    expect(rawAiOutputSchema.safeParse("just a string").success).toBe(false);
  });
});

describe("patientContextSchema", () => {
  it("accepts an empty object and a fully populated one", () => {
    expect(patientContextSchema.safeParse({}).success).toBe(true);
    expect(
      patientContextSchema.safeParse({
        ageYears: 34,
        gender: "female",
        knownConditionsNote: "Known hypertension, on treatment.",
      }).success,
    ).toBe(true);
  });

  it("rejects an out-of-range or wrong-typed ageYears", () => {
    expect(patientContextSchema.safeParse({ ageYears: -1 }).success).toBe(false);
    expect(patientContextSchema.safeParse({ ageYears: 999 }).success).toBe(false);
    expect(patientContextSchema.safeParse({ ageYears: "thirty-four" }).success).toBe(false);
    expect(patientContextSchema.safeParse({ ageYears: 34.5 }).success).toBe(false);
  });

  it("rejects unexpected extra fields", () => {
    const result = patientContextSchema.safeParse({
      ageYears: 34,
      organizationId: "org-123", // must never be absorbed by this module
    });
    expect(result.success).toBe(false);
  });
});

describe("processVisitInputSchema", () => {
  it("accepts a transcript with no patientContext", () => {
    expect(processVisitInputSchema.safeParse({ transcript: "Patient reports a cough." }).success).toBe(
      true,
    );
  });

  it("accepts a transcript with a valid patientContext", () => {
    const result = processVisitInputSchema.safeParse({
      transcript: "Patient reports a cough.",
      patientContext: { ageYears: 5, gender: "male" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing transcript field", () => {
    expect(processVisitInputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-string transcript", () => {
    expect(processVisitInputSchema.safeParse({ transcript: 12345 }).success).toBe(false);
    expect(processVisitInputSchema.safeParse({ transcript: null }).success).toBe(false);
    expect(processVisitInputSchema.safeParse({ transcript: { text: "hi" } }).success).toBe(false);
  });

  it("rejects a malformed patientContext nested inside a valid transcript", () => {
    const result = processVisitInputSchema.safeParse({
      transcript: "Patient reports a cough.",
      patientContext: { ageYears: "not a number" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects unexpected top-level fields (e.g. an accidentally-forwarded organizationId)", () => {
    const result = processVisitInputSchema.safeParse({
      transcript: "Patient reports a cough.",
      organizationId: "org-123",
    });
    expect(result.success).toBe(false);
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
