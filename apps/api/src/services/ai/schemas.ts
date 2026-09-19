import { z } from "zod";

/**
 * Zod schemas for the AI module. Two layers, deliberately:
 *
 * 1. `rawAiOutputSchema` — the minimal shape we ask the model for and trust
 *    it to fill in. It only asks the model to make a judgement call where it
 *    genuinely must (labeling a reported concern as patient- vs
 *    CHW-sourced). `missingInformation` and `suggestedFollowUps` are plain
 *    strings here — their sourceType is always AI_SUGGESTED, which is
 *    stamped in code (service.ts), not requested from or trusted to the
 *    model. That makes mislabeling those fields structurally impossible.
 *
 * 2. `careNestAiResultSchema` — the fully assembled result returned to
 *    callers, re-validated as a final gate (belt and suspenders) after
 *    service.ts stamps source tags and appends the safety block.
 */

export const sourceTypeSchema = z.enum([
  "PATIENT_REPORTED",
  "CHW_RECORDED",
  "AI_SUGGESTED",
  "PROVIDER_VERIFIED",
]);

const MAX_LIST_ITEMS = 20;

/**
 * Validates the *input* to processVisit() — untrusted the moment it crosses
 * a module boundary, even though the caller is internal (a future Visit
 * service), not a raw HTTP body. `.strict()` on patientContext rejects
 * unexpected fields (e.g. a caller accidentally passing along something like
 * an organizationId) rather than silently ignoring them — this module must
 * never absorb fields it wasn't designed to carry. Transcript length is
 * intentionally unbounded here (checked separately in service.ts against
 * MAX_TRANSCRIPT_LENGTH) so the empty/too-long cases can report distinct,
 * more specific error codes than a generic schema failure would.
 */
export const patientContextSchema = z
  .object({
    ageYears: z.number().int().min(0).max(130).optional(),
    gender: z.string().trim().min(1).max(50).optional(),
    knownConditionsNote: z.string().trim().max(1000).optional(),
  })
  .strict();

export const processVisitInputSchema = z
  .object({
    transcript: z.string(),
    patientContext: patientContextSchema.optional(),
  })
  .strict();

export const rawAiOutputSchema = z.object({
  summary: z.string().trim().min(1, "summary must not be empty").max(2000),
  reportedConcerns: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(500),
        sourceType: z.enum(["PATIENT_REPORTED", "CHW_RECORDED"]),
      }),
    )
    .max(MAX_LIST_ITEMS),
  missingInformation: z.array(z.string().trim().min(1).max(300)).max(MAX_LIST_ITEMS),
  suggestedFollowUps: z.array(z.string().trim().min(1).max(300)).max(MAX_LIST_ITEMS),
});

export type RawAiOutput = z.infer<typeof rawAiOutputSchema>;

export const attributedItemSchema = z.object({
  text: z.string().trim().min(1).max(500),
  sourceType: sourceTypeSchema,
});

export const careNestAiResultSchema = z.object({
  summary: attributedItemSchema.refine((item) => item.sourceType === "AI_SUGGESTED", {
    message: "summary.sourceType must be AI_SUGGESTED",
  }),
  reportedConcerns: z.array(
    attributedItemSchema.refine(
      (item) => item.sourceType === "PATIENT_REPORTED" || item.sourceType === "CHW_RECORDED",
      { message: "reportedConcerns entries must be PATIENT_REPORTED or CHW_RECORDED" },
    ),
  ),
  missingInformation: z.array(
    attributedItemSchema.refine((item) => item.sourceType === "AI_SUGGESTED", {
      message: "missingInformation entries must be AI_SUGGESTED",
    }),
  ),
  suggestedFollowUps: z.array(
    attributedItemSchema.refine((item) => item.sourceType === "AI_SUGGESTED", {
      message: "suggestedFollowUps entries must be AI_SUGGESTED",
    }),
  ),
  safety: z.object({
    disclaimer: z.string().min(1),
    flags: z.array(z.string()),
  }),
  meta: z.object({
    model: z.string().min(1),
    generatedAt: z.string().min(1),
  }),
});

export type CareNestAiResultParsed = z.infer<typeof careNestAiResultSchema>;
