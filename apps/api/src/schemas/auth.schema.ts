import { z } from "zod";

export const userRoleSchema = z.enum(["ADMIN", "CHW", "SUPERVISOR"]);

export const loginBodySchema = z.object({
  email: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(512),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

export const authUserSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  role: userRoleSchema,
  name: z.string().min(1),
  email: z.string().email(),
  active: z.boolean(),
});

export const loginResponseSchema = z.object({
  token: z.string().min(1),
  user: authUserSchema,
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;