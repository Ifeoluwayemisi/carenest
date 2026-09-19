/**
 * Shared auth contract types. Keep these aligned with docs/API.md.
 */

export type UserRole = "ADMIN" | "CHW" | "SUPERVISOR";

/**
 * The authenticated user as resolved from the database on every protected
 * request. organizationId always comes from the authenticated user — never
 * from request input.
 */
export interface AuthUser {
  id: string;
  organizationId: string;
  role: UserRole;
  name: string;
  email: string;
  active: boolean;
}

declare module "fastify" {
  interface FastifyRequest {
    /** Set by the authenticate preHandler on protected routes. */
    auth?: AuthUser;
  }
}