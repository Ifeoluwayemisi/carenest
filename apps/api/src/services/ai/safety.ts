export const SAFETY_DISCLAIMER =
  "This section was drafted by AI from the visit transcript. It is not a diagnosis or medical advice. A trained human must review, correct, and confirm this record before it is considered final.";

interface UnsafePattern {
  category: "diagnostic_language" | "prescriptive_language" | "invented_vitals";
  pattern: RegExp;
}

/**
 * Patterns that indicate the model diagnosed, prescribed, or fabricated a
 * clinical measurement instead of documenting. This is a heuristic
 * second layer behind the system prompt (prompt.ts) — the prompt tells the
 * model not to do these things, this catches it if the model does them
 * anyway. Deliberately over-inclusive: a false positive just means a draft
 * gets rejected and the CHW documents manually, which is the safe failure
 * mode for a tool that must never invent clinical content.
 */
const UNSAFE_PATTERNS: UnsafePattern[] = [
  { category: "diagnostic_language", pattern: /\bdiagnos(e|is|ed|ing)\b/i },
  // Covers both second-person ("you have...") and the more common
  // AI-authored third-person phrasing ("the patient has...", "she is
  // suffering from...") — a summary written about "the patient" is the
  // realistic case, not "you", so both must be caught.
  {
    category: "diagnostic_language",
    pattern: /\b(you|the patient|patient|he|she|they) (has|have|is suffering from|are suffering from)\b/i,
  },
  { category: "diagnostic_language", pattern: /\bthis (is|indicates)\s+(a case of|likely)\b/i },
  { category: "diagnostic_language", pattern: /\brule(s)?\s+out\b/i },
  { category: "prescriptive_language", pattern: /\bprescri(be|bed|bing|ption)\b/i },
  { category: "prescriptive_language", pattern: /\b\d+(\.\d+)?\s?(mg|mcg|ml)\b/i },
  {
    category: "prescriptive_language",
    pattern: /\b(take|administer|give)\b[\s\S]{0,20}\b(tablet|capsule|dose|daily|twice)\b/i,
  },
  { category: "prescriptive_language", pattern: /\bover[- ]the[- ]counter\b/i },
  { category: "invented_vitals", pattern: /\b\d{2,3}\/\d{2,3}\s?(mmhg)?\b/i },
  { category: "invented_vitals", pattern: /\b\d{2,3}\s?bpm\b/i },
  { category: "invented_vitals", pattern: /\bspo2\s?\d{1,3}%?\b/i },
  { category: "invented_vitals", pattern: /\b\d{2}(\.\d)?\s?°\s?(c|f)\b/i },
];

/**
 * Scans AI-authored text — summary, missingInformation, suggestedFollowUps —
 * for language indicating the model overstepped into diagnosis,
 * prescription, or fabricated vitals. Deliberately NOT applied to
 * reportedConcerns: those are meant to faithfully restate what the
 * transcript already contains (e.g. a CHW's own note might legitimately
 * mention a medication that was given before the visit was recorded), so
 * screening them against this list would censor accurate documentation
 * rather than catch AI fabrication.
 *
 * Returns the distinct violation categories found; empty if the text is clean.
 */
export function scanForUnsafeLanguage(text: string): string[] {
  const hits = new Set<string>();
  for (const { category, pattern } of UNSAFE_PATTERNS) {
    if (pattern.test(text)) {
      hits.add(category);
    }
  }
  return [...hits];
}
