import type { FastifyInstance } from "fastify";
import {
  createFollowUpController,
  listPatientFollowUpsController,
  updateFollowUpController,
} from "../controllers/follow-ups.controller";
import { authenticate, requireRole } from "../middlewares/auth";

/**
 * Organization-scoped follow-ups / actions. ADMIN and CHW create; ADMIN, CHW
 * and SUPERVISOR read and update. organizationId always comes from the
 * authenticated user; cross-organization resources surface as 404.
 */
export async function followUpRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/v1/follow-ups",
    { preHandler: [authenticate, requireRole("CHW", "ADMIN")] },
    createFollowUpController,
  );
  app.get(
    "/api/v1/patients/:id/follow-ups",
    { preHandler: [authenticate, requireRole("CHW", "ADMIN", "SUPERVISOR")] },
    listPatientFollowUpsController,
  );
  app.patch(
    "/api/v1/follow-ups/:id",
    { preHandler: [authenticate, requireRole("CHW", "ADMIN", "SUPERVISOR")] },
    updateFollowUpController,
  );
}