import { apiFetch } from "@/lib/api";
import type { Patient, PatientTimeline } from "@/types/domain";

export interface CreatePatientInput {
  firstName: string;
  lastName: string;
  uniqueId?: string;
  clientGeneratedId?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: string;
}

export async function listPatients(search?: string): Promise<Patient[]> {
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  const body = await apiFetch<{ success: true; data: { patients: Patient[] } }>(
    `/api/v1/patients${query}`,
  );
  return body.data.patients;
}

export async function getPatient(id: string): Promise<Patient> {
  const body = await apiFetch<{ success: true; data: { patient: Patient } }>(
    `/api/v1/patients/${id}`,
  );
  return body.data.patient;
}

export async function createPatient(input: CreatePatientInput): Promise<Patient> {
  const body = await apiFetch<{ success: true; data: { patient: Patient } }>("/api/v1/patients", {
    method: "POST",
    body: input,
  });
  return body.data.patient;
}

export async function getPatientTimeline(patientId: string): Promise<PatientTimeline> {
  const body = await apiFetch<{ success: true; data: PatientTimeline }>(
    `/api/v1/patients/${patientId}/timeline`,
  );
  return body.data;
}
