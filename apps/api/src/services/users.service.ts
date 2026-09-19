import bcrypt from "bcrypt";
import { isUniqueViolation } from "../lib/db-errors";
import { AppError, NotFoundError } from "../lib/errors";
import {
  createUser,
  findUserByEmail,
  findUserByOrg,
  listUsersByOrganization,
  setUserActive,
  toPublicUser,
  updateUser,
  type PublicUser,
  type UpdateUserInput,
} from "../repositories/users.repository";

const BCRYPT_ROUNDS = 10;
const DUPLICATE_EMAIL_MESSAGE = "A user with this email already exists";

export interface CreateChwInput {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
}

export interface UpdateOrgUserInput {
  name?: string;
  email?: string;
  phone?: string | null;
  password?: string;
}

/**
 * CHW onboarding: an ADMIN creates a CHW with an initial password. No public
 * registration, no invitation flow — the demo bootstrap is the seeded org/admin
 * + this endpoint. Role is always CHW (never taken from the body).
 */
export async function createCHW(
  organizationId: string,
  input: CreateChwInput,
): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AppError(409, "CONFLICT", DUPLICATE_EMAIL_MESSAGE);
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  try {
    const record = await createUser(organizationId, {
      role: "CHW",
      name: input.name,
      email,
      passwordHash,
      phone: input.phone ?? null,
    });
    return toPublicUser(record);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, "CONFLICT", DUPLICATE_EMAIL_MESSAGE);
    }
    throw error;
  }
}

export async function listOrgUsers(
  organizationId: string,
  role?: "ADMIN" | "CHW" | "SUPERVISOR",
): Promise<PublicUser[]> {
  const records = await listUsersByOrganization(organizationId, role);
  return records.map(toPublicUser);
}

export async function getOrgUser(
  organizationId: string,
  id: string,
): Promise<PublicUser> {
  const record = await findUserByOrg(organizationId, id);
  if (!record) {
    throw new NotFoundError("User not found");
  }
  return toPublicUser(record);
}

export async function updateOrgUser(
  organizationId: string,
  id: string,
  patch: UpdateOrgUserInput,
): Promise<PublicUser> {
  const repoPatch: UpdateUserInput = {};
  if (patch.email !== undefined) {
    const email = patch.email.trim().toLowerCase();
    const existing = await findUserByEmail(email);
    if (existing && existing.id !== id) {
      throw new AppError(409, "CONFLICT", DUPLICATE_EMAIL_MESSAGE);
    }
    repoPatch.email = email;
  }
  if (patch.name !== undefined) {
    repoPatch.name = patch.name;
  }
  if (patch.phone !== undefined) {
    repoPatch.phone = patch.phone;
  }
  if (patch.password !== undefined) {
    repoPatch.passwordHash = await bcrypt.hash(patch.password, BCRYPT_ROUNDS);
  }

  try {
    const record = await updateUser(organizationId, id, repoPatch);
    if (!record) {
      throw new NotFoundError("User not found");
    }
    return toPublicUser(record);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, "CONFLICT", DUPLICATE_EMAIL_MESSAGE);
    }
    throw error;
  }
}

/**
 * Deactivates or reactivates an org user. Deactivation immediately revokes the
 * user's access on every protected route because `authenticate` re-checks the
 * active flag in the database for each request. An admin cannot deactivate
 * their own account (self lockout guard).
 */
export async function setOrgUserActive(
  organizationId: string,
  id: string,
  active: boolean,
  actingUserId: string,
): Promise<PublicUser> {
  if (!active && id === actingUserId) {
    throw new AppError(400, "VALIDATION_ERROR", "You cannot deactivate your own account");
  }
  const record = await setUserActive(organizationId, id, active);
  if (!record) {
    throw new NotFoundError("User not found");
  }
  return toPublicUser(record);
}