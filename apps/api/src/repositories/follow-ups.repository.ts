import { query } from "../db/pool";

/**
 * Org-scoped data access for follow-ups. Every function takes `organizationId`
 * explicitly; cross-organization rows are never selected.
 *
 * Offline sync note: `client_generated_id` is the single idempotency concept,
 * unique per organization (follow_ups_org_client_uidx). createFollowUp is
 * retry-safe — re-sending the same client_generated_id returns the existing
 * row instead of inserting a duplicate.
 */
export interface FollowUpRecord {
  id: string;
  organizationId: string;
  patientId: string;
  visitId: string | null;
  assignedTo: string | null;
  summary: string;
  dueDate: string | null;
  status: "OPEN" | "COMPLETED" | "CANCELLED";
  clientGeneratedId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FollowUpRow {
  id: string;
  organization_id: string;
  patient_id: string;
  visit_id: string | null;
  assigned_to: string | null;
  summary: string;
  due_date: string | null;
  status: FollowUpRecord["status"];
  client_generated_id: string | null;
  created_at: string;
  updated_at: string;
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

// due_date is read back as YYYY-MM-DD so the API never exposes a time-shifted
// JS Date serialization (same convention as patients.date_of_birth).
const SELECT_FOLLOW_UP = `
  SELECT id, organization_id, patient_id, visit_id, assigned_to, summary,
         to_char(due_date, 'YYYY-MM-DD') AS due_date,
         status, client_generated_id, created_at, updated_at
  FROM follow_ups
`;

function mapFollowUp(row: FollowUpRow): FollowUpRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    patientId: row.patient_id,
    visitId: row.visit_id,
    assignedTo: row.assigned_to,
    summary: row.summary,
    dueDate: row.due_date,
    status: row.status,
    clientGeneratedId: row.client_generated_id,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export interface CreateFollowUpInput {
  patientId: string;
  visitId?: string | null;
  summary: string;
  dueDate?: string | null;
  assignedTo?: string | null;
  clientGeneratedId?: string | null;
}

export async function createFollowUp(
  organizationId: string,
  input: CreateFollowUpInput,
): Promise<FollowUpRecord> {
  const result = await query<FollowUpRow>(
    `INSERT INTO follow_ups
       (organization_id, patient_id, visit_id, assigned_to, summary, due_date,
        client_generated_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (organization_id, client_generated_id) DO NOTHING
     RETURNING id, organization_id, patient_id, visit_id, assigned_to, summary,
       to_char(due_date, 'YYYY-MM-DD') AS due_date,
       status, client_generated_id, created_at, updated_at`,
    [
      organizationId,
      input.patientId,
      input.visitId ?? null,
      input.assignedTo ?? null,
      input.summary,
      input.dueDate ?? null,
      input.clientGeneratedId ?? null,
    ],
  );

  if (result.rows[0]) {
    return mapFollowUp(result.rows[0]);
  }

  // ON CONFLICT DO NOTHING returned no row: the (org, client_generated_id) pair
  // already exists. Return the existing follow-up for idempotent retries.
  if (input.clientGeneratedId) {
    const existing = await findFollowUpByClientId(organizationId, input.clientGeneratedId);
    if (existing) {
      return existing;
    }
  }
  throw new Error("createFollowUp: duplicate client_generated_id with no existing row");
}

export async function findFollowUpByClientId(
  organizationId: string,
  clientGeneratedId: string,
): Promise<FollowUpRecord | null> {
  const result = await query<FollowUpRow>(
    `${SELECT_FOLLOW_UP} WHERE organization_id = $1 AND client_generated_id = $2 LIMIT 1`,
    [organizationId, clientGeneratedId],
  );
  return result.rows[0] ? mapFollowUp(result.rows[0]) : null;
}

export async function getFollowUp(
  organizationId: string,
  id: string,
): Promise<FollowUpRecord | null> {
  const result = await query<FollowUpRow>(
    `${SELECT_FOLLOW_UP} WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [id, organizationId],
  );
  return result.rows[0] ? mapFollowUp(result.rows[0]) : null;
}

export async function listPatientFollowUps(
  organizationId: string,
  patientId: string,
): Promise<FollowUpRecord[]> {
  const result = await query<FollowUpRow>(
    `${SELECT_FOLLOW_UP}
      WHERE organization_id = $1 AND patient_id = $2
      ORDER BY created_at DESC`,
    [organizationId, patientId],
  );
  return result.rows.map(mapFollowUp);
}

export interface UpdateFollowUpInput {
  summary?: string;
  status?: FollowUpRecord["status"];
  dueDate?: string | null;
  assignedTo?: string | null;
}

export async function updateFollowUp(
  organizationId: string,
  id: string,
  patch: UpdateFollowUpInput,
): Promise<FollowUpRecord | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (patch.summary !== undefined) {
    fields.push(`summary = $${index++}`);
    values.push(patch.summary);
  }
  if (patch.status !== undefined) {
    fields.push(`status = $${index++}`);
    values.push(patch.status);
  }
  if (patch.dueDate !== undefined) {
    fields.push(`due_date = $${index++}`);
    values.push(patch.dueDate ?? null);
  }
  if (patch.assignedTo !== undefined) {
    fields.push(`assigned_to = $${index++}`);
    values.push(patch.assignedTo ?? null);
  }

  if (fields.length === 0) {
    return getFollowUp(organizationId, id);
  }

  values.push(organizationId, id);
  const result = await query<FollowUpRow>(
    `UPDATE follow_ups SET ${fields.join(", ")}
     WHERE organization_id = $${index++} AND id = $${index}
     RETURNING id, organization_id, patient_id, visit_id, assigned_to, summary,
       to_char(due_date, 'YYYY-MM-DD') AS due_date,
       status, client_generated_id, created_at, updated_at`,
    values,
  );
  return result.rows[0] ? mapFollowUp(result.rows[0]) : null;
}