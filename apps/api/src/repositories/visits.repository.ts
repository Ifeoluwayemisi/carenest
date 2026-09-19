import { query } from "../db/pool";

/**
 * Org-scoped data access for visits. Every function takes `organizationId`
 * explicitly; cross-organization rows are never selected.
 *
 * Offline sync note: `client_generated_id` is the single idempotency concept,
 * unique per organization (visits_org_client_uidx). createVisit is
 * retry-safe — re-sending the same client_generated_id returns the existing
 * row instead of inserting a duplicate.
 */
export interface VisitRecord {
  id: string;
  organizationId: string;
  patientId: string;
  chwId: string;
  visitedAt: string;
  notes: string | null;
  transcript: string | null;
  aiGeneratedJson: Record<string, unknown> | null;
  aiStatus: "PENDING" | "READY" | "VALIDATED" | "FAILED";
  aiValidated: boolean;
  aiReviewedAt: string | null;
  aiError: string | null;
  confirmedJson: Record<string, unknown> | null;
  reviewNotes: string | null;
  status: "DRAFT" | "UNDER_REVIEW" | "CONFIRMED";
  confirmedBy: string | null;
  confirmedAt: string | null;
  clientGeneratedId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface VisitRow {
  id: string;
  organization_id: string;
  patient_id: string;
  chw_id: string;
  visited_at: string;
  notes: string | null;
  transcript: string | null;
  ai_generated_json: Record<string, unknown> | null;
  ai_status: VisitRecord["aiStatus"];
  ai_validated: boolean;
  ai_reviewed_at: string | null;
  ai_error: string | null;
  confirmed_json: Record<string, unknown> | null;
  review_notes: string | null;
  status: VisitRecord["status"];
  confirmed_by: string | null;
  confirmed_at: string | null;
  client_generated_id: string | null;
  created_at: string;
  updated_at: string;
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

const SELECT_VISIT = `
  SELECT id, organization_id, patient_id, chw_id, visited_at, notes, transcript,
         ai_generated_json, ai_status, ai_validated, ai_reviewed_at, ai_error,
         confirmed_json, review_notes, status, confirmed_by, confirmed_at,
         client_generated_id, created_at, updated_at
  FROM visits
`;

function mapVisit(row: VisitRow): VisitRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    patientId: row.patient_id,
    chwId: row.chw_id,
    visitedAt: toIso(row.visited_at),
    notes: row.notes,
    transcript: row.transcript,
    aiGeneratedJson: row.ai_generated_json,
    aiStatus: row.ai_status,
    aiValidated: row.ai_validated,
    aiReviewedAt: row.ai_reviewed_at ? toIso(row.ai_reviewed_at) : null,
    aiError: row.ai_error,
    confirmedJson: row.confirmed_json,
    reviewNotes: row.review_notes,
    status: row.status,
    confirmedBy: row.confirmed_by,
    confirmedAt: row.confirmed_at ? toIso(row.confirmed_at) : null,
    clientGeneratedId: row.client_generated_id,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export interface CreateVisitInput {
  patientId: string;
  transcript: string;
  visitedAt: string;
  notes?: string | null;
  clientGeneratedId?: string | null;
}

export async function createVisit(
  organizationId: string,
  chwId: string,
  input: CreateVisitInput,
): Promise<VisitRecord> {
  const result = await query<VisitRow>(
    `INSERT INTO visits
       (organization_id, patient_id, chw_id, visited_at, transcript, notes,
        client_generated_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (organization_id, client_generated_id) DO NOTHING
     RETURNING id, organization_id, patient_id, chw_id, visited_at, notes, transcript,
       ai_generated_json, ai_status, ai_validated, ai_reviewed_at, ai_error,
       confirmed_json, review_notes, status, confirmed_by, confirmed_at,
       client_generated_id, created_at, updated_at`,
    [
      organizationId,
      input.patientId,
      chwId,
      input.visitedAt,
      input.transcript,
      input.notes ?? null,
      input.clientGeneratedId ?? null,
    ],
  );

  if (result.rows[0]) {
    return mapVisit(result.rows[0]);
  }

  if (input.clientGeneratedId) {
    const existing = await findVisitByClientId(organizationId, input.clientGeneratedId);
    if (existing) {
      return existing;
    }
  }
  throw new Error("createVisit: duplicate client_generated_id with no existing row");
}

export async function findVisitByClientId(
  organizationId: string,
  clientGeneratedId: string,
): Promise<VisitRecord | null> {
  const result = await query<VisitRow>(
    `${SELECT_VISIT} WHERE organization_id = $1 AND client_generated_id = $2 LIMIT 1`,
    [organizationId, clientGeneratedId],
  );
  return result.rows[0] ? mapVisit(result.rows[0]) : null;
}

export async function getVisit(
  organizationId: string,
  id: string,
): Promise<VisitRecord | null> {
  const result = await query<VisitRow>(
    `${SELECT_VISIT} WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [id, organizationId],
  );
  return result.rows[0] ? mapVisit(result.rows[0]) : null;
}

/** Records the success full run of the AI structuring pipeline. */
export async function markVisitAiValidated(
  organizationId: string,
  id: string,
  aiGeneratedJson: Record<string, unknown>,
): Promise<void> {
  await query(
    `UPDATE visits
        SET ai_generated_json = $3,
            ai_status = 'VALIDATED',
            ai_validated = true,
            ai_reviewed_at = now()
      WHERE organization_id = $1 AND id = $2`,
    [organizationId, id, aiGeneratedJson],
  );
}

/** Records an AI structuring failure; the transcript stays intact for manual review. */
export async function markVisitAiFailed(
  organizationId: string,
  id: string,
  aiError: string,
): Promise<void> {
  await query(
    `UPDATE visits
        SET ai_status = 'FAILED',
            ai_validated = false,
            ai_error = $3,
            ai_reviewed_at = now()
      WHERE organization_id = $1 AND id = $2`,
    [organizationId, id, aiError],
  );
}

export interface ReviewVisitInput {
  notes?: string | null;
  reviewNotes?: string | null;
}

export async function updateVisitReview(
  organizationId: string,
  id: string,
  patch: ReviewVisitInput,
): Promise<VisitRecord | null> {
  const fields: string[] = ["status = 'UNDER_REVIEW'"];
  const values: unknown[] = [];
  let index = 1;

  if (patch.notes !== undefined) {
    fields.push(`notes = $${index++}`);
    values.push(patch.notes ?? null);
  }
  if (patch.reviewNotes !== undefined) {
    fields.push(`review_notes = $${index++}`);
    values.push(patch.reviewNotes ?? null);
  }

  values.push(organizationId, id);
  const result = await query<VisitRow>(
    `UPDATE visits SET ${fields.join(", ")}
      WHERE organization_id = $${index++} AND id = $${index}
      RETURNING id, organization_id, patient_id, chw_id, visited_at, notes, transcript,
       ai_generated_json, ai_status, ai_validated, ai_reviewed_at, ai_error,
       confirmed_json, review_notes, status, confirmed_by, confirmed_at,
       client_generated_id, created_at, updated_at`,
    values,
  );
  return result.rows[0] ? mapVisit(result.rows[0]) : null;
}

export interface ConfirmVisitInput {
  confirmedJson: Record<string, unknown>;
  confirmedBy: string;
  reviewNotes?: string | null;
}

export async function confirmVisit(
  organizationId: string,
  id: string,
  input: ConfirmVisitInput,
): Promise<VisitRecord | null> {
  const result = await query<VisitRow>(
    `UPDATE visits
        SET confirmed_json = $3,
            confirmed_by = $4,
            confirmed_at = now(),
            review_notes = COALESCE($5, review_notes),
            status = 'CONFIRMED'
      WHERE organization_id = $1 AND id = $2
      RETURNING id, organization_id, patient_id, chw_id, visited_at, notes, transcript,
       ai_generated_json, ai_status, ai_validated, ai_reviewed_at, ai_error,
       confirmed_json, review_notes, status, confirmed_by, confirmed_at,
       client_generated_id, created_at, updated_at`,
    [organizationId, id, input.confirmedJson, input.confirmedBy, input.reviewNotes ?? null],
  );
  return result.rows[0] ? mapVisit(result.rows[0]) : null;
}

export async function listPatientVisits(
  organizationId: string,
  patientId: string,
): Promise<VisitRecord[]> {
  const result = await query<VisitRow>(
    `${SELECT_VISIT}
      WHERE organization_id = $1 AND patient_id = $2
      ORDER BY visited_at DESC, created_at DESC`,
    [organizationId, patientId],
  );
  return result.rows.map(mapVisit);
}