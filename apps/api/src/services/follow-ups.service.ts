import { AppError, NotFoundError } from "../lib/errors";
import { getPatient } from "../repositories/patients.repository";
import { findUserByOrg } from "../repositories/users.repository";
import { getVisit } from "../repositories/visits.repository";
import {
  createFollowUp as insertFollowUp,
  listPatientFollowUps,
  updateFollowUp,
  type CreateFollowUpInput,
  type FollowUpRecord,
  type UpdateFollowUpInput,
} from "../repositories/follow-ups.repository";

async function assertOrgPatient(organizationId: string, patientId: string) {
  const patient = await getPatient(organizationId, patientId);
  if (!patient) {
    throw new NotFoundError("Patient not found");
  }
  return patient;
}

/**
 * Creates a follow-up in the caller's organization. The organization always
 * comes from the authenticated user. Related resources (patient, visit,
 * assignee) must all belong to the same organization, otherwise the resource
 * does not exist from this caller's perspective (404) — never a leak.
 */
export async function createOrgFollowUp(
  organizationId: string,
  input: CreateFollowUpInput,
): Promise<FollowUpRecord> {
  await assertOrgPatient(organizationId, input.patientId);

  if (input.visitId) {
    const visit = await getVisit(organizationId, input.visitId);
    if (!visit) {
      throw new NotFoundError("Visit not found");
    }
    if (visit.patientId !== input.patientId) {
      throw new AppError(400, "VALIDATION_ERROR", "Visit does not belong to the given patient");
    }
  }

  if (input.assignedTo) {
    const assignee = await findUserByOrg(organizationId, input.assignedTo);
    if (!assignee) {
      throw new NotFoundError("Assigned user not found");
    }
  }

  return insertFollowUp(organizationId, input);
}

export async function listOrgPatientFollowUps(
  organizationId: string,
  patientId: string,
): Promise<FollowUpRecord[]> {
  await assertOrgPatient(organizationId, patientId);
  return listPatientFollowUps(organizationId, patientId);
}

export async function updateOrgFollowUp(
  organizationId: string,
  id: string,
  patch: UpdateFollowUpInput,
): Promise<FollowUpRecord> {
  if (patch.assignedTo) {
    const assignee = await findUserByOrg(organizationId, patch.assignedTo);
    if (!assignee) {
      throw new NotFoundError("Assigned user not found");
    }
  }

  const updated = await updateFollowUp(organizationId, id, patch);
  if (!updated) {
    throw new NotFoundError("Follow-up not found");
  }
  return updated;
}