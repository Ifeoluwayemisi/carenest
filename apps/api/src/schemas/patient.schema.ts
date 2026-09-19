import { z } from "zod";

/** YYYY-MM-DD with a real calendar check (rejects e.g. 2026-02-31). */
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "dateOfBirth must be a YYYY-MM-DD date")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "dateOfBirth is not a valid calendar date");

export const createPatientBodySchema = z.object({
  uniqueId: z.string().trim().min(1).max(64).optional(),
  clientGeneratedId: z.string().uuid().optional(),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  dateOfBirth: dateStringSchema.optional().nullable(),
  gender: z.string().trim().min(1).max(20).optional().nullable(),
  phone: z.string().trim().min(1).max(40).optional().nullable(),
  address: z.string().trim().min(1).max(255).optional().nullable(),
});

export type CreatePatientBody = z.infer<typeof createPatientBodySchema>;

export const updatePatientBodySchema = z.object({
  uniqueId: z.string().trim().min(1).max(64).optional().nullable(),
  firstName: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().min(1).max(120).optional(),
  dateOfBirth: dateStringSchema.optional().nullable(),
  gender: z.string().trim().min(1).max(20).optional().nullable(),
  phone: z.string().trim().min(1).max(40).optional().nullable(),
  address: z.string().trim().min(1).max(255).optional().nullable(),
});

export type UpdatePatientBody = z.infer<typeof updatePatientBodySchema>;

export const patientParamsSchema = z.object({ id: z.string().uuid() });

export type PatientParams = z.infer<typeof patientParamsSchema>;

export const listPatientsQuerySchema = z.object({
  search: z.string().trim().max(255).optional(),
});

export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;

export const patientSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  uniqueId: z.string().nullable(),
  clientGeneratedId: z.string().uuid().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string().nullable(),
  gender: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Patient = z.infer<typeof patientSchema>;

export const patientResponseSchema = z.object({ patient: patientSchema });

export type PatientResponse = z.infer<typeof patientResponseSchema>;

export const patientsResponseSchema = z.object({ patients: z.array(patientSchema) });

export type PatientsResponse = z.infer<typeof patientsResponseSchema>;