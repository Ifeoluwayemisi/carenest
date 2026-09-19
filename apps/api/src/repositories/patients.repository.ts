import { query } from "../db/pool";

/**
 * Org-scoped data access for patients. Every function takes `organizationId`
 * explicitly; cross-organization rows are simply never selected.
 *
 * Offline sync note: `client_generated_id` is the single idempotency concept,
 * unique per organization (patients_org_client_uidx). createPatient is
 * retry-safe — re-sending the same client_generated_id returns the existing
 * row instead of inserting a duplicate.
 */
export interface PatientRecord {
  id: string;
  organizationId: string;
  uniqueId: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  createdBy: string | null;
  clientGeneratedId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PatientRow {
  id: string;
  organization_id: string;
  unique_id: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  created_by: string | null;
  client_generated_id: string | null;
  created_at: string;
  updated_at: string;
}

// date_of_birth is read back as YYYY-MM-DD so the API surface never exposes a
// time-shifted JS Date serialization.
const SELECT_PATIENT = `
  SELECT id, organization_id, unique_id, first_name, last_name,
         to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
         gender, phone, address, created_by, client_generated_id, created_at, updated_at
  FROM patients
`;

function mapPatient(row: PatientRow): PatientRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    uniqueId: row.unique_id,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    phone: row.phone,
    address: row.address,
    createdBy: row.created_by,
    clientGeneratedId: row.client_generated_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreatePatientInput {
  uniqueId?: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  phone?: string | null;
  address?: string | null;
  clientGeneratedId?: string | null;
}

export async function createPatient(
  organizationId: string,
  createdBy: string,
  input: CreatePatientInput,
): Promise<PatientRecord> {
  const result = await query<PatientRow>(
    `INSERT INTO patients
       (organization_id, unique_id, first_name, last_name, date_of_birth,
        gender, phone, address, created_by, client_generated_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (organization_id, client_generated_id) DO NOTHING
     RETURNING id, organization_id, unique_id, first_name, last_name,
       to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
       gender, phone, address, created_by, client_generated_id, created_at, updated_at`,
    [
      organizationId,
      input.uniqueId ?? null,
      input.firstName,
      input.lastName,
      input.dateOfBirth ?? null,
      input.gender ?? null,
      input.phone ?? null,
      input.address ?? null,
      createdBy,
      input.clientGeneratedId ?? null,
    ],
  );

  if (result.rows[0]) {
    return mapPatient(result.rows[0]);
  }

  // ON CONFLICT DO NOTHING returned no row: the (org, client_generated_id)
  // pair already exists. Return the existing patient for idempotent retries.
  if (input.clientGeneratedId) {
    const existing = await findPatientByClientId(organizationId, input.clientGeneratedId);
    if (existing) {
      return existing;
    }
  }
  throw new Error("createPatient: duplicate client_generated_id with no existing row");
}

export async function findPatientByClientId(
  organizationId: string,
  clientGeneratedId: string,
): Promise<PatientRecord | null> {
  const result = await query<PatientRow>(
    `${SELECT_PATIENT} WHERE organization_id = $1 AND client_generated_id = $2 LIMIT 1`,
    [organizationId, clientGeneratedId],
  );
  return result.rows[0] ? mapPatient(result.rows[0]) : null;
}

export async function getPatient(
  organizationId: string,
  id: string,
): Promise<PatientRecord | null> {
  const result = await query<PatientRow>(
    `${SELECT_PATIENT} WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [id, organizationId],
  );
  return result.rows[0] ? mapPatient(result.rows[0]) : null;
}

export async function listPatients(
  organizationId: string,
  search?: string,
): Promise<PatientRecord[]> {
  const term = search?.trim();
  if (term) {
    const like = `%${term}%`;
    const result = await query<PatientRow>(
      `${SELECT_PATIENT}
       WHERE organization_id = $1
         AND (first_name ILIKE $2 OR last_name ILIKE $2 OR unique_id ILIKE $2 OR phone ILIKE $2)
       ORDER BY updated_at DESC`,
      [organizationId, like],
    );
    return result.rows.map(mapPatient);
  }
  const result = await query<PatientRow>(
    `${SELECT_PATIENT} WHERE organization_id = $1 ORDER BY updated_at DESC`,
    [organizationId],
  );
  return result.rows.map(mapPatient);
}

export interface UpdatePatientInput {
  uniqueId?: string | null;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  phone?: string | null;
  address?: string | null;
}

export async function updatePatient(
  organizationId: string,
  id: string,
  patch: UpdatePatientInput,
): Promise<PatientRecord | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (patch.uniqueId !== undefined) {
    fields.push(`unique_id = $${index++}`);
    values.push(patch.uniqueId ?? null);
  }
  if (patch.firstName !== undefined) {
    fields.push(`first_name = $${index++}`);
    values.push(patch.firstName);
  }
  if (patch.lastName !== undefined) {
    fields.push(`last_name = $${index++}`);
    values.push(patch.lastName);
  }
  if (patch.dateOfBirth !== undefined) {
    fields.push(`date_of_birth = $${index++}`);
    values.push(patch.dateOfBirth ?? null);
  }
  if (patch.gender !== undefined) {
    fields.push(`gender = $${index++}`);
    values.push(patch.gender ?? null);
  }
  if (patch.phone !== undefined) {
    fields.push(`phone = $${index++}`);
    values.push(patch.phone ?? null);
  }
  if (patch.address !== undefined) {
    fields.push(`address = $${index++}`);
    values.push(patch.address ?? null);
  }

  if (fields.length === 0) {
    return getPatient(organizationId, id);
  }

  values.push(organizationId, id);
  const result = await query<PatientRow>(
    `UPDATE patients SET ${fields.join(", ")}
     WHERE organization_id = $${index++} AND id = $${index}
     RETURNING id, organization_id, unique_id, first_name, last_name,
       to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
       gender, phone, address, created_by, client_generated_id, created_at, updated_at`,
    values,
  );
  return result.rows[0] ? mapPatient(result.rows[0]) : null;
}