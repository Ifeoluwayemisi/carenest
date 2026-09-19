import type { FastifyRequest } from "fastify";
import type { AuthUser } from "../types/auth";
import { AppError } from "./errors";

/**
 * Returns the authenticated user set by the `authenticate` preHandler. All
 * protected routes run that guard first, so `request.auth` is always present;
 * this only throws if a route forgot its preHandler (defensive 401).
 */
export function requireAuth(request: FastifyRequest): AuthUser {
  const auth = request.auth;
  if (!auth) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  return auth;
}