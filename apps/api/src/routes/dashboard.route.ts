import type { FastifyInstance } from "fastify";
import { dashboardSummaryController } from "../controllers/dashboard.controller";
import { authenticate, requireRole } from "../middlewares/auth";

/**
 * Supervisor dashboard. ADMIN and SUPERVISOR only. The summary is always
 * organization-scoped to the authenticated user.
 */
export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/v1/dashboard/summary",
    { preHandler: [authenticate, requireRole("ADMIN", "SUPERVISOR")] },
    dashboardSummaryController,
  );
}