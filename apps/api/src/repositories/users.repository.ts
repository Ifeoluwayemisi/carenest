import { query } from "../db/pool";
import type { AuthUser, UserRole } from "../types/auth";

/** Raw users row plus the organization-scoped fields the app surface needs. */
export interface UserRecord {
  id: string;
  organizationId: string;
  role: UserRole;
  name: string;
  email: string;
  passwordHash: string;
  phone: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserRow {
  id: string;
  organization_id: string;
  role: UserRole;
  name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const SELECT_USER = `
  SELECT id, organization_id, role, name, email, password_hash, phone, active, created_at, updated_at
  FROM users
`;

function mapUser(row: UserRow | undefined): UserRecord | null {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    organizationId: row.organization_id,
    role: row.role,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    phone: row.phone,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Maps a user record to the public auth surface (never exposes password_hash). */
export function toAuthUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    organizationId: user.organizationId,
    role: user.role,
    name: user.name,
    email: user.email,
    active: user.active,
  };
}

/** Case-insensitive email lookup, backed by the users_email_lower_uidx index. */
export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const result = await query<UserRow>(
    `${SELECT_USER} WHERE lower(email) = lower($1) LIMIT 1`,
    [email],
  );
  return mapUser(result.rows[0]);
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const result = await query<UserRow>(`${SELECT_USER} WHERE id = $1 LIMIT 1`, [id]);
  return mapUser(result.rows[0]);
}

/** The user-management surface exposed to admins/supervisors (no password hash). */
export interface PublicUser {
  id: string;
  organizationId: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Maps a user record to the admin-facing surface (never exposes password_hash). */
export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    organizationId: user.organizationId,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export interface CreateUserInput {
  role: UserRole;
  name: string;
  email: string;
  passwordHash: string;
  phone?: string | null;
}

export async function createUser(
  organizationId: string,
  input: CreateUserInput,
): Promise<UserRecord> {
  const result = await query<UserRow>(
    `INSERT INTO users (organization_id, role, name, email, password_hash, phone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, organization_id, role, name, email, password_hash, phone, active, created_at, updated_at`,
    [organizationId, input.role, input.name, input.email, input.passwordHash, input.phone ?? null],
  );
  const record = mapUser(result.rows[0]);
  if (!record) {
    throw new Error("createUser returned no row");
  }
  return record;
}

export async function listUsersByOrganization(
  organizationId: string,
  role?: UserRole,
): Promise<UserRecord[]> {
  const sql = role
    ? `${SELECT_USER} WHERE organization_id = $1 AND role = $2 ORDER BY created_at DESC`
    : `${SELECT_USER} WHERE organization_id = $1 ORDER BY created_at DESC`;
  const params = role ? [organizationId, role] : [organizationId];
  const result = await query<UserRow>(sql, params);
  return result.rows.map((row) => mapUser(row) as UserRecord);
}

/** Org-scoped lookup so user management never escapes the actor's organization. */
export async function findUserByOrg(
  organizationId: string,
  id: string,
): Promise<UserRecord | null> {
  const result = await query<UserRow>(
    `${SELECT_USER} WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [id, organizationId],
  );
  return mapUser(result.rows[0]);
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  phone?: string | null;
  passwordHash?: string;
}

export async function updateUser(
  organizationId: string,
  id: string,
  patch: UpdateUserInput,
): Promise<UserRecord | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (patch.name !== undefined) {
    fields.push(`name = $${index++}`);
    values.push(patch.name);
  }
  if (patch.email !== undefined) {
    fields.push(`email = $${index++}`);
    values.push(patch.email);
  }
  if (patch.phone !== undefined) {
    fields.push(`phone = $${index++}`);
    values.push(patch.phone ?? null);
  }
  if (patch.passwordHash !== undefined) {
    fields.push(`password_hash = $${index++}`);
    values.push(patch.passwordHash);
  }

  if (fields.length === 0) {
    return findUserByOrg(organizationId, id);
  }

  values.push(organizationId, id);
  const result = await query<UserRow>(
    `UPDATE users SET ${fields.join(", ")}
     WHERE organization_id = $${index++} AND id = $${index}
     RETURNING id, organization_id, role, name, email, password_hash, phone, active, created_at, updated_at`,
    values,
  );
  return mapUser(result.rows[0]);
}

export async function setUserActive(
  organizationId: string,
  id: string,
  active: boolean,
): Promise<UserRecord | null> {
  const result = await query<UserRow>(
    `UPDATE users SET active = $3
     WHERE organization_id = $1 AND id = $2
     RETURNING id, organization_id, role, name, email, password_hash, phone, active, created_at, updated_at`,
    [organizationId, id, active],
  );
  return mapUser(result.rows[0]);
}