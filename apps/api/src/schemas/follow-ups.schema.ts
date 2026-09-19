import { z } from "zod";

/** YYYY-MM-DD with a real calendar check (same contract as patient dates). */
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "dueDate must be a YYYY-MM-DD date")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "dueDate is not a valid calendar date");

/** Schema-compatible follow-up statuses. OPEN is the pending state. */
export const followUpStatusSchema = z.enum(["OPEN", "COMPLETED", "CANCELLED"]);

export type FollowUpStatus = z.infer<typeof followUpStatusSchema>;

export const createFollowUpBodySchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional().nullable(),
  summary: z.string().trim().min(1).max(2000),
  dueDate: dateStringSchema.optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  clientGeneratedId: z.string().uuid().optional(),
});

export type CreateFollowUpBody = z.infer<typeof createFollowUpBodySchema>;

export const updateFollowUpBodySchema = z.object({
  summary: z.string().trim().min(1).max(2000).optional(),
  status: followUpStatusSchema.optional(),
  dueDate: dateStringSchema.optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
});

export type UpdateFollowUpBody = z.infer<typeof updateFollowUpBodySchema>;

export const followUpParamsSchema = z.object({ id: z.string().uuid() });

export type FollowUpParams = z.infer<typeof followUpParamsSchema>;

export const followUpPatientParamsSchema = z.object({ id: z.string().uuid() });

export type FollowUpPatientParams = z.infer<typeof followUpPatientParamsSchema>;

export const followUpSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().nullable(),
  assignedTo: z.string().uuid().nullable(),
  summary: z.string(),
  dueDate: z.string().nullable(),
  status: followUpStatusSchema,
  clientGeneratedId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FollowUp = z.infer<typeof followUpSchema>;

export const followUpResponseSchema = z.object({ followUp: followUpSchema });

export type FollowUpResponse = z.infer<typeof followUpResponseSchema>;

export const followUpsResponseSchema = z.object({ followUps: z.array(followUpSchema) });

export type FollowUpsResponse = z.infer<typeof followUpsResponseSchema>;