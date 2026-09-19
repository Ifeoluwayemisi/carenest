import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../lib/errors";
import { findUserByEmail, findUserById, toAuthUser } from "../repositories/users.repository";
import type { AuthUser } from "../types/auth";

/** JWT lifetime: 12 hours from issuance. */
const MAX_JWT_AGE_SECONDS = 12 * 60 * 60;

// Compared against whenever the email is unknown so unknown-email and
// wrong-password attempts take roughly the same time (avoids trivial
// user-enumeration via response timing).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("carenest-password-timing-equalizer", 10);

/**
 * Signs a JWT with a minimal payload: sub, iat, exp. The secret lives only on
 * the server; tokens are never stored server-side.
 */
export function issueToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({ sub: userId, iat: now, exp: now + MAX_JWT_AGE_SECONDS }, env.JWT_SECRET);
}

/**
 * Verifies credentials and returns a token plus the authenticated user.
 * Email lookup is case-insensitive (service layer normalizes to lowercase).
 */
export async function login(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    throw new AppError(401, "UNAUTHORIZED", "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid email or password");
  }

  if (!user.active) {
    throw new AppError(403, "FORBIDDEN", "This account has been deactivated");
  }

  return { token: issueToken(user.id), user: toAuthUser(user) };
}

/**
 * Resolves the authenticated user from a fresh database lookup. Called on every
 * protected request so deactivated or removed accounts are rejected even when a
 * not-yet-expired JWT is presented.
 */
export async function getAuthUser(userId: string): Promise<AuthUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid token");
  }
  if (!user.active) {
    throw new AppError(403, "FORBIDDEN", "This account has been deactivated");
  }
  return toAuthUser(user);
}