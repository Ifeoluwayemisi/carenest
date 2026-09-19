import type { FastifyReply, FastifyRequest } from "fastify";
import { requireAuth } from "../lib/auth-context";
import { type DashboardResponse } from "../schemas/dashboard.schema";
import { getOrgDashboardSummary } from "../services/dashboard.service";

export async function dashboardSummaryController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);

  const summary = await getOrgDashboardSummary(auth.organizationId);

  reply.send({ success: true, data: { summary } satisfies DashboardResponse });
}