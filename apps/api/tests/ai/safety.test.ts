import { describe, expect, it } from "vitest";
import { scanForUnsafeLanguage } from "../../src/services/ai/safety";

describe("scanForUnsafeLanguage", () => {
  it("returns no violations for clean documentation text", () => {
    expect(scanForUnsafeLanguage("Patient reported a cough for three days.")).toEqual([]);
    expect(scanForUnsafeLanguage("No temperature was recorded during this visit.")).toEqual([]);
  });

  it("flags diagnostic language", () => {
    expect(scanForUnsafeLanguage("This diagnosis suggests malaria.")).toContain(
      "diagnostic_language",
    );
    expect(scanForUnsafeLanguage("You have a respiratory infection.")).toContain(
      "diagnostic_language",
    );
    expect(scanForUnsafeLanguage("We can rule out dehydration.")).toContain("diagnostic_language");
  });

  it("flags third-person diagnostic phrasing (the realistic case for AI-authored summaries)", () => {
    // Regression test: the model writes about "the patient", not "you" — an
    // AI summary asserting a diagnosis in third person must be caught just
    // as reliably as second-person phrasing.
    expect(scanForUnsafeLanguage("Patient has malaria.")).toContain("diagnostic_language");
    expect(scanForUnsafeLanguage("The patient has malaria and needs treatment.")).toContain(
      "diagnostic_language",
    );
    expect(scanForUnsafeLanguage("She is suffering from tuberculosis.")).toContain(
      "diagnostic_language",
    );
    expect(scanForUnsafeLanguage("He has diabetes.")).toContain("diagnostic_language");
  });

  it("flags prescriptive language", () => {
    expect(scanForUnsafeLanguage("Prescribe amoxicillin for the infection.")).toContain(
      "prescriptive_language",
    );
    expect(scanForUnsafeLanguage("Give 500 mg twice daily.")).toContain("prescriptive_language");
    expect(scanForUnsafeLanguage("Take one tablet daily.")).toContain("prescriptive_language");
  });

  it("flags invented vitals patterns", () => {
    expect(scanForUnsafeLanguage("Blood pressure was 120/80 mmHg.")).toContain(
      "invented_vitals",
    );
    expect(scanForUnsafeLanguage("Heart rate was 98 bpm.")).toContain("invented_vitals");
    expect(scanForUnsafeLanguage("SpO2 97%.")).toContain("invented_vitals");
  });

  it("can flag multiple categories in one string", () => {
    const violations = scanForUnsafeLanguage(
      "Diagnosis: hypertension. Prescribe 10 mg daily. BP was 150/95 mmHg.",
    );
    expect(violations).toContain("diagnostic_language");
    expect(violations).toContain("prescriptive_language");
    expect(violations).toContain("invented_vitals");
  });

  it("does not flag ordinary numbers unrelated to vitals/dosage", () => {
    expect(scanForUnsafeLanguage("The patient lives 5 kilometers from the clinic.")).toEqual([]);
  });

  it("documents a known, accepted false-positive tradeoff: 'patient has <symptom>' also gets flagged", () => {
    // The broadened third-person diagnostic pattern (see the regression test
    // above) cannot distinguish "the patient has malaria" (a diagnosis) from
    // "the patient has a cough" (a benign symptom restatement) without a
    // curated disease-name list, which this module deliberately does not
    // maintain. Per the existing design philosophy (see the UNSAFE_PATTERNS
    // comment above), over-inclusion is the accepted, safe failure mode: a
    // false positive here just means the draft is rejected and the CHW
    // documents manually — never a fabricated or unsafe record slipping
    // through. prompt.ts mitigates this by instructing the model to prefer
    // "reported/observed" phrasing over "has" phrasing in the first place.
    expect(scanForUnsafeLanguage("The patient has a mild cough.")).toContain("diagnostic_language");
  });
});
