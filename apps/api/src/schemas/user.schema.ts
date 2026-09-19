import { z } from "zod";
import { userRoleSchema } from "./auth.schema";

export const createUserBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().min(1).max(320).email(),
  password: z.string().min(8).max(512),
  phone: z.string().trim().max(30).optional().nullable(),
});

export type CreateUserBody = z.infer<typeof createUserBodySchema>;

export const updateUserBodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().min(1).max(320).email().optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  password: z.string().min(8).max(512).optional(),
});

export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;

export const userParamsSchema = z.object({ id: z.string().uuid() });

export type UserParams = z.infer<typeof userParamsSchema>;

export const listUsersQuerySchema = z.object({
  role: userRoleSchema.optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const publicUserSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  role: userRoleSchema,
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PublicUser = z.infer<typeof publicUserSchema>;

export const userResponseSchema = z.object({ user: publicUserSchema });

export type UserResponse = z.infer<typeof userResponseSchema>;

export const usersResponseSchema = z.object({ users: z.array(publicUserSchema) });

export type UsersResponse = z.infer<typeof usersResponseSchema>;