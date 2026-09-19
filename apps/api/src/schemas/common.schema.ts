import { z } from "zod";

export const errorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "CONFLICT",
  "INTERNAL_ERROR",
]);

export const errorBodySchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  details: z.array(z.unknown()).optional(),
});

export const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: errorBodySchema,
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;