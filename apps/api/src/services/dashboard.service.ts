import { getDashboardSummary, type DashboardSummaryRecord } from "../repositories/dashboard.repository";

/** Single thin service for the org-scoped supervisor dashboard summary. */
export async function getOrgDashboardSummary(
  organizationId: string,
): Promise<DashboardSummaryRecord> {
  return getDashboardSummary(organizationId);
}