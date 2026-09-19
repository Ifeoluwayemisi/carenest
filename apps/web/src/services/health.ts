import { apiFetch } from "@/lib/api";
import type { HealthResponse } from "@/types/api";

/** Probes the backend health endpoint. */
export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}