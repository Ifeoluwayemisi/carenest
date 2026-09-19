import { apiFetch } from "@/lib/api";
import type { DashboardSummary } from "@/types/domain";

/** ADMIN/SUPERVISOR only — the backend returns 403 for CHW callers. */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const body = await apiFetch<{ success: true; data: { summary: DashboardSummary } }>(
    "/api/v1/dashboard/summary",
  );
  return body.data.summary;
}
