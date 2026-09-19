import { processVisit } from "../services/ai";
import { transcribeAudio } from "../services/speech";
import { AppError, NotFoundError } from "../lib/errors";
import { getPatient } from "../repositories/patients.repository";
import {
  confirmVisit,
  createVisit,
  getVisit,
  listPatientVisits,
  markVisitAiFailed,
  markVisitAiValidated,
  updateVisitReview,
  type CreateVisitInput,
  type VisitRecord,
} from "../repositories/visits.repository";
import type { PatientContext } from "../services/ai";

type ProcessVisitFn = (typeof processVisit);
type TranscribeAudioFn = (typeof transcribeAudio);

/**
 * Injectable seams for the AI/STT modules, so the visit tests exercise both
 * the success and failure paths deterministically without a live provider.
 * Production behavior is the real processVisit/transcribeAudio.
 */
const visitDeps: { processVisit: ProcessVisitFn; transcribeAudio: TranscribeAudioFn } = {
  processVisit,
  transcribeAudio,
};

export function setVisitDeps(
  deps: Partial<{ processVisit: ProcessVisitFn; transcribeAudio: TranscribeAudioFn }>,
): void {
  Object.assign(visitDeps, deps);
}

export function resetVisitDeps(): void {
  visitDeps.processVisit = processVisit;
  visitDeps.transcribeAudio = transcribeAudio;
}

function ageYears(dob: string | null): number | undefined {
  if (!dob) return undefined;
  const [y, m, d] = dob.split("-").map(Number);
  const now = new Date();
  let age = now.getUTCFullYear() - y;
  const monthNow = now.getUTCMonth() + 1;
  const dayNow = now.getUTCDate();
  if (monthNow < m || (monthNow === m && dayNow < d)) {
    age -= 1;
  }
  return age >= 0 ? age : undefined;
}

/** Maps the patient row into the loose PatientContext the AI module expects. */
function toPatientContext(dateOfBirth: string | null, gender: string | null): PatientContext {
  return {
    ageYears: ageYears(dateOfBirth),
    gender: gender ?? undefined,
  };
}

async function assertOrgPatient(organizationId: string, patientId: string) {
  const patient = await getPatient(organizationId, patientId);
  if (!patient) {
    throw new NotFoundError("Patient not found");
  }
  return patient;
}

/**
 * Creates a visit from a transcript (CHW-typed text or the output of STT).
 * The transcript row is saved first; the AI draft is attached afterwards, so
 * an AI failure never destroys the visit.
 */
export async function createOrgVisitFromTranscript(
  organizationId: string,
  chwId: string,
  input: CreateVisitInput,
): Promise<VisitRecord> {
  const patient = await assertOrgPatient(organizationId, input.patientId);

  const visit = await createVisit(organizationId, chwId, input);

  const aiResult = await visitDeps.processVisit({
    transcript: input.transcript,
    patientContext: toPatientContext(patient.dateOfBirth, patient.gender),
  });

  if (aiResult.success) {
    const draft = JSON.parse(JSON.stringify(aiResult.data)) as Record<string, unknown>;
    await markVisitAiValidated(organizationId, visit.id, draft);
  } else {
    await markVisitAiFailed(organizationId, visit.id, `${aiResult.error.code}: ${aiResult.error.message}`);
  }

  const updated = await getVisit(organizationId, visit.id);
  if (!updated) {
    throw new Error("createOrgVisitFromTranscript: visit row disappeared after AI update");
  }
  return updated;
}

/**
 * Voice visit: transcribes the uploaded audio first, then follows the exact
 * same path as a text visit. On STT failure no visit row is created and the
 * error is surfaced so the CHW can retry as text.
 */
export async function createOrgVisitFromAudio(
  organizationId: string,
  chwId: string,
  input: Omit<CreateVisitInput, "transcript"> & { audio: Buffer; filename: string; mimeType: string },
): Promise<VisitRecord> {
  const stt = await visitDeps.transcribeAudio({
    audio: input.audio,
    filename: input.filename,
    mimeType: input.mimeType,
  });

  if (!stt.success) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `Speech-to-text failed (${stt.error.code}). Retry as a text visit.`,
      [{ code: stt.error.code, message: stt.error.message }],
    );
  }

  return createOrgVisitFromTranscript(organizationId, chwId, {
    patientId: input.patientId,
    transcript: stt.data.text,
    visitedAt: input.visitedAt,
    notes: input.notes,
    clientGeneratedId: input.clientGeneratedId,
  });
}

export async function getOrgVisit(
  organizationId: string,
  id: string,
): Promise<VisitRecord> {
  const visit = await getVisit(organizationId, id);
  if (!visit) {
    throw new NotFoundError("Visit not found");
  }
  return visit;
}

export async function reviewOrgVisit(
  organizationId: string,
  id: string,
  patch: { notes?: string | null; reviewNotes?: string | null },
): Promise<VisitRecord> {
  const visit = await updateVisitReview(organizationId, id, patch);
  if (!visit) {
    throw new NotFoundError("Visit not found");
  }
  return visit;
}

export async function confirmOrgVisit(
  organizationId: string,
  confirmedBy: string,
  id: string,
  input: { confirmedJson: Record<string, unknown>; reviewNotes?: string | null },
): Promise<VisitRecord> {
  const visit = await confirmVisit(organizationId, id, {
    confirmedJson: input.confirmedJson,
    confirmedBy,
    reviewNotes: input.reviewNotes,
  });
  if (!visit) {
    throw new NotFoundError("Visit not found");
  }
  return visit;
}

export async function getOrgPatientTimeline(
  organizationId: string,
  patientId: string,
): Promise<VisitRecord[]> {
  await assertOrgPatient(organizationId, patientId);
  return listPatientVisits(organizationId, patientId);
}