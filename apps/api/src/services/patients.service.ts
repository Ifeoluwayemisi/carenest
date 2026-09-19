import { NotFoundError } from "../lib/errors";
import {
  createPatient,
  getPatient as getPatientRecord,
  listPatients as listPatientsByOrg,
  updatePatient as updatePatientRecord,
  type CreatePatientInput,
  type PatientRecord,
  type UpdatePatientInput,
} from "../repositories/patients.repository";
import type { Patient } from "../schemas/patient.schema";

function toPatient(record: PatientRecord): Patient {
  return {
    id: record.id,
    organizationId: record.organizationId,
    uniqueId: record.uniqueId,
    clientGeneratedId: record.clientGeneratedId,
    firstName: record.firstName,
    lastName: record.lastName,
    dateOfBirth: record.dateOfBirth,
    gender: record.gender,
    phone: record.phone,
    address: record.address,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Creates an organization-scoped patient. Retry-safe for offline sync: when a
 * `client_generated_id` is provided and already exists for this organization,
 * the existing patient is returned instead of creating a duplicate.
 */
export async function createOrgPatient(
  organizationId: string,
  createdBy: string,
  input: CreatePatientInput,
): Promise<Patient> {
  const record = await createPatient(organizationId, createdBy, input);
  return toPatient(record);
}

export async function listOrgPatients(
  organizationId: string,
  search?: string,
): Promise<Patient[]> {
  const records = await listPatientsByOrg(organizationId, search);
  return records.map(toPatient);
}

export async function getOrgPatient(
  organizationId: string,
  id: string,
): Promise<Patient> {
  const record = await getPatientRecord(organizationId, id);
  if (!record) {
    throw new NotFoundError("Patient not found");
  }
  return toPatient(record);
}

export async function updateOrgPatient(
  organizationId: string,
  id: string,
  patch: UpdatePatientInput,
): Promise<Patient> {
  const record = await updatePatientRecord(organizationId, id, patch);
  if (!record) {
    throw new NotFoundError("Patient not found");
  }
  return toPatient(record);
}