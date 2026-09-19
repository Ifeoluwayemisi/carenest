import { apiFetch } from "@/lib/api";
import type { FollowUp, FollowUpStatus } from "@/types/domain";

export interface CreateFollowUpInput {
  patientId: string;
  visitId?: string | null;
  summary: string;
  dueDate?: string | null;
  assignedTo?: string | null;
  clientGeneratedId?: string;
}

export async function createFollowUp(input: CreateFollowUpInput): Promise<FollowUp> {
  const body = await apiFetch<{ success: true; data: { followUp: FollowUp } }>(
    "/api/v1/follow-ups",
    { method: "POST", body: input },
  );
  return body.data.followUp;
}

export async function listPatientFollowUps(patientId: string): Promise<FollowUp[]> {
  const body = await apiFetch<{ success: true; data: { followUps: FollowUp[] } }>(
    `/api/v1/patients/${patientId}/follow-ups`,
  );
  return body.data.followUps;
}

export async function updateFollowUp(
  id: string,
  patch: { summary?: string; status?: FollowUpStatus; dueDate?: string | null; assignedTo?: string | null },
): Promise<FollowUp> {
  const body = await apiFetch<{ success: true; data: { followUp: FollowUp } }>(
    `/api/v1/follow-ups/${id}`,
    { method: "PATCH", body: patch },
  );
  return body.data.followUp;
}
