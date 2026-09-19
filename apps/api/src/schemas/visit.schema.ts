import { z } from "zod";

export const sourceTypeSchema = z.enum([
  "PATIENT_REPORTED",
  "CHW_RECORDED",
  "AI_SUGGESTED",
  "PROVIDER_VERIFIED",
]);

export type SourceType = z.infer<typeof sourceTypeSchema>;

const attributedItemSchema = z.object({
  text: z.string().min(1),
  sourceType: sourceTypeSchema,
});

/** Human-confirmed structured record, preserving source attribution shape
 * (same { text, sourceType } contract as the AI draft, per docs/ai-visit-integration.md). */
export const confirmedVisitJsonSchema = z.object({
  summary: attributedItemSchema,
  reportedConcerns: z.array(attributedItemSchema),
  missingInformation: z.array(attributedItemSchema),
  suggestedFollowUps: z.array(attributedItemSchema),
  safety: z
    .object({ disclaimer: z.string(), flags: z.array(z.string()) })
    .optional(),
  meta: z
    .object({ model: z.string(), generatedAt: z.string() })
    .optional(),
});

export type ConfirmedVisitJson = z.infer<typeof confirmedVisitJsonSchema>;

export const createVisitBodySchema = z.object({
  patientId: z.string().uuid(),
  visitedAt: z.string().datetime().optional(),
  clientGeneratedId: z.string().uuid().optional(),
  transcript: z.string().trim().min(1).max(100_000),
  notes: z.string().trim().max(10_000).optional().nullable(),
});

export type CreateVisitBody = z.infer<typeof createVisitBodySchema>;

/** Multipart-form fields for a voice visit (audio file handled separately). */
export const createAudioVisitBodySchema = z.object({
  patientId: z.string().uuid(),
  visitedAt: z.string().datetime().optional(),
  clientGeneratedId: z.string().uuid().optional(),
  notes: z.string().trim().max(10_000).optional().nullable(),
});

export type CreateAudioVisitBody = z.infer<typeof createAudioVisitBodySchema>;

export const patientParamsForTimelineSchema = z.object({ id: z.string().uuid() });

export const reviewVisitBodySchema = z.object({
  notes: z.string().trim().max(10_000).optional().nullable(),
  reviewNotes: z.string().trim().max(10_000).optional().nullable(),
});

export type ReviewVisitBody = z.infer<typeof reviewVisitBodySchema>;

export const confirmVisitBodySchema = z.object({
  confirmedJson: confirmedVisitJsonSchema,
  reviewNotes: z.string().trim().max(10_000).optional().nullable(),
});

export type ConfirmVisitBody = z.infer<typeof confirmVisitBodySchema>;

export const visitParamsSchema = z.object({ id: z.string().uuid() });

export type VisitParams = z.infer<typeof visitParamsSchema>;

export const visitStatusSchema = z.enum(["DRAFT", "UNDER_REVIEW", "CONFIRMED"]);
export const visitAiStatusSchema = z.enum(["PENDING", "READY", "VALIDATED", "FAILED"]);

export const visitSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  chwId: z.string().uuid(),
  visitedAt: z.string(),
  notes: z.string().nullable(),
  transcript: z.string().nullable(),
  aiGeneratedJson: z.record(z.string(), z.unknown()).nullable(),
  aiStatus: visitAiStatusSchema,
  aiValidated: z.boolean(),
  aiReviewedAt: z.string().nullable(),
  aiError: z.string().nullable(),
  confirmedJson: z.record(z.string(), z.unknown()).nullable(),
  reviewNotes: z.string().nullable(),
  status: visitStatusSchema,
  confirmedBy: z.string().uuid().nullable(),
  confirmedAt: z.string().nullable(),
  clientGeneratedId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Visit = z.infer<typeof visitSchema>;

export const visitResponseSchema = z.object({ visit: visitSchema });
export type VisitResponse = z.infer<typeof visitResponseSchema>;

export const visitTimelineEntrySchema = z.object({
  id: z.string().uuid(),
  visitedAt: z.string(),
  status: visitStatusSchema,
  aiStatus: visitAiStatusSchema,
  summary: z.string().nullable(),
  transcript: z.string().nullable(),
  confirmedBy: z.string().uuid().nullable(),
  confirmedAt: z.string().nullable(),
  createdAt: z.string(),
});

export type VisitTimelineEntry = z.infer<typeof visitTimelineEntrySchema>;

export const timelineResponseSchema = z.object({
  patientId: z.string().uuid(),
  visits: z.array(visitTimelineEntrySchema),
  followUps: z.array(z.unknown()),
});
export type TimelineResponse = z.infer<typeof timelineResponseSchema>;