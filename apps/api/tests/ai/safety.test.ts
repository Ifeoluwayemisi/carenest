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
});
