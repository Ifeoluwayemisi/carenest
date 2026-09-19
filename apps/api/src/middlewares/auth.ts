import type { FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../lib/errors";
import { getAuthUser } from "../services/auth.service";
import type { UserRole } from "../types/auth";

export interface Claims {
  sub?: string;
}

/**
 * Auth preHandler. Verifies the bearer JWT and re-checks the database on every
 * authenticated request so deactivated/removed users are rejected immediately.
 *   - missing auth            -> 401 UNAUTHORIZED
 *   - malformed/invalid token -> 401 UNAUTHORIZED
 *   - expired token           -> 401 UNAUTHORIZED
 *   - inactive account        -> 403 FORBIDDEN
 */
export async function authenticate(request: FastifyRequest): Promise<void> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "UNAUTHORIZED", "Missing or invalid Authorization header");
  }

  const token = header.slice("Bearer ".length).trim();
  if (token.length === 0) {
    throw new AppError(401, "UNAUTHORIZED", "Missing or invalid Authorization header");
  }

  let claims: Claims;
  try {
    claims = jwt.verify(token, env.JWT_SECRET) as Claims;
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired token");
  }

  if (!claims.sub) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired token");
  }

  request.auth = await getAuthUser(claims.sub);
}

/**
 * Role guard preHandler; must run after authenticate. Returns an async hook so
 * Fastify's hook runner can await its completion (sync hooks only advance when
 * they throw; a successful sync return hangs the request).
 */
export function requireRole(...roles: readonly UserRole[]) {
  return async (request: FastifyRequest): Promise<void> => {
    const auth = request.auth;
    if (!auth) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }
    if (!roles.includes(auth.role)) {
      throw new AppError(403, "FORBIDDEN", "Insufficient role for this action");
    }
  };
}