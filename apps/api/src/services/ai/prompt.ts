import type { ProcessVisitInput } from "./types";

const JSON_SHAPE_INSTRUCTIONS = `Respond with ONLY a single JSON object (no markdown, no commentary, no text before or after it) matching exactly this shape:
{
  "summary": string,
  "reportedConcerns": [{ "text": string, "sourceType": "PATIENT_REPORTED" | "CHW_RECORDED" }],
  "missingInformation": [string, ...],
  "suggestedFollowUps": [string, ...]
}`;

const SYSTEM_PROMPT = `You are a documentation assistant for Community Health Workers (CHWs) in a low-resource field setting, part of the CareNest system.

Your ONLY job is to structure a visit transcript into a fixed JSON shape. You are NOT a doctor and this is NOT a clinical tool.

STRICT RULES — never break these:
- Never diagnose a condition or name a disease the patient "has".
- Never prescribe, recommend, or reference medication, dosage, or treatment.
- Never invent symptoms, vitals, measurements, or any fact not explicitly present in the transcript.
- Never make an emergency or clinical decision, and never instruct the CHW on what treatment to give.
- "reportedConcerns" must only restate what the patient or CHW explicitly said in the transcript, tagged with who said it: "PATIENT_REPORTED" for something the patient said, "CHW_RECORDED" for the CHW's own observation or note. Do not add anything not present in the transcript.
- "missingInformation" should name standard documentation fields that are absent from this transcript (for example: "duration of symptoms not mentioned", "no temperature recorded"). Never speculate about what might be medically wrong with the patient.
- "suggestedFollowUps" may only suggest non-clinical next steps, such as scheduling a re-visit, referring to a facility for in-person evaluation, or verifying missing information at the next visit. Never suggest a treatment, medication, or diagnostic test.
- If the transcript has no reportable content for a field, return an empty array for it — never fabricate content to fill it.
- If the transcript is unclear, contradictory, or too short to structure meaningfully, still return the JSON shape with your best-effort summary and empty/partial arrays as appropriate — do not refuse and do not add commentary outside the JSON.

${JSON_SHAPE_INSTRUCTIONS}`;

/**
 * Builds the system/user prompt pair for a visit transcript. Patient context
 * is included only as framing for the model, explicitly labeled as such —
 * the system prompt instructs the model not to restate context fields as
 * facts unless they also appear in the transcript, so a stale or wrong
 * context field can't leak into the AI's output as if it were reported.
 */
export function buildPrompt(input: ProcessVisitInput): { system: string; user: string } {
  const ctx = input.patientContext;
  const contextLines: string[] = [];
  if (ctx?.ageYears !== undefined) contextLines.push(`Patient age: ${ctx.ageYears} years`);
  if (ctx?.gender) contextLines.push(`Patient gender: ${ctx.gender}`);
  if (ctx?.knownConditionsNote) contextLines.push(`CHW-provided context: ${ctx.knownConditionsNote}`);

  const contextBlock =
    contextLines.length > 0
      ? `Patient context (for framing only — do not restate as a reported concern unless it also appears in the transcript below):\n${contextLines.join("\n")}\n\n`
      : "";

  const user = `${contextBlock}Visit transcript:\n"""\n${input.transcript}\n"""\n\nStructure this transcript now, following the rules exactly.`;

  return { system: SYSTEM_PROMPT, user };
}
