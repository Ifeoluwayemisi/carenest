import type { FastifyInstance } from "fastify";
import {
  createPatientController,
  getPatientController,
  listPatientsController,
  updatePatientController,
} from "../controllers/patients.controller";
import { authenticate, requireRole } from "../middlewares/auth";

/**
 * Organization-scoped patient management. CHW and ADMIN create/update;
 * SUPERVISOR is read-only. organizationId always comes from the authenticated
 * user, never from the request.
 */
export async function patientRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/v1/patients",
    { preHandler: [authenticate, requireRole("CHW", "ADMIN")] },
    createPatientController,
  );
  app.get(
    "/api/v1/patients",
    { preHandler: [authenticate, requireRole("CHW", "ADMIN", "SUPERVISOR")] },
    listPatientsController,
  );
  app.get(
    "/api/v1/patients/:id",
    { preHandler: [authenticate, requireRole("CHW", "ADMIN", "SUPERVISOR")] },
    getPatientController,
  );
  app.patch(
    "/api/v1/patients/:id",
    { preHandler: [authenticate, requireRole("CHW", "ADMIN")] },
    updatePatientController,
  );
}