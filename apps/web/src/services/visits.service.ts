import { apiFetch } from "@/lib/api";
import type { CareNestAiResult, Visit } from "@/types/domain";

export interface CreateTextVisitInput {
  patientId: string;
  transcript: string;
  visitedAt?: string;
  notes?: string | null;
  clientGeneratedId?: string;
}

export interface CreateAudioVisitInput {
  patientId: string;
  audio: Blob;
  filename: string;
  visitedAt?: string;
  notes?: string | null;
  clientGeneratedId?: string;
}

function unwrapVisit(body: { success: true; data: { visit: Visit } }): Visit {
  return body.data.visit;
}

/** Text visit — CHW-typed transcript, or the frontend's own offline sync retry. */
export async function createTextVisit(input: CreateTextVisitInput): Promise<Visit> {
  const body = await apiFetch<{ success: true; data: { visit: Visit } }>("/api/v1/visits", {
    method: "POST",
    body: input,
  });
  return unwrapVisit(body);
}

/**
 * Voice visit — same endpoint, dispatched by the backend on Content-Type.
 * apiFetch leaves FormData bodies alone so the browser sets the multipart
 * boundary itself.
 */
export async function createAudioVisit(input: CreateAudioVisitInput): Promise<Visit> {
  const form = new FormData();
  form.set("patientId", input.patientId);
  form.set("audio", input.audio, input.filename);
  if (input.visitedAt) form.set("visitedAt", input.visitedAt);
  if (input.notes) form.set("notes", input.notes);
  if (input.clientGeneratedId) form.set("clientGeneratedId", input.clientGeneratedId);

  const body = await apiFetch<{ success: true; data: { visit: Visit } }>("/api/v1/visits", {
    method: "POST",
    body: form,
  });
  return unwrapVisit(body);
}

export async function getVisit(id: string): Promise<Visit> {
  const body = await apiFetch<{ success: true; data: { visit: Visit } }>(`/api/v1/visits/${id}`);
  return unwrapVisit(body);
}

export async function reviewVisit(
  id: string,
  patch: { notes?: string | null; reviewNotes?: string | null },
): Promise<Visit> {
  const body = await apiFetch<{ success: true; data: { visit: Visit } }>(
    `/api/v1/visits/${id}`,
    { method: "PATCH", body: patch },
  );
  return unwrapVisit(body);
}

export async function confirmVisit(
  id: string,
  confirmedJson: CareNestAiResult,
  reviewNotes?: string | null,
): Promise<Visit> {
  const body = await apiFetch<{ success: true; data: { visit: Visit } }>(
    `/api/v1/visits/${id}/confirm`,
    { method: "POST", body: { confirmedJson, reviewNotes } },
  );
  return unwrapVisit(body);
}
