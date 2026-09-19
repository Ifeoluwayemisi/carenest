import type { FastifyInstance } from "fastify";
import {
  createUserController,
  deactivateUserController,
  getUserController,
  listUsersController,
  reactivateUserController,
  updateUserController,
} from "../controllers/users.controller";
import { authenticate, requireRole } from "../middlewares/auth";

/**
 * Organization user management (CHW onboarding). ADMIN manages users;
 * SUPERVISOR is read-only; CHW has no access to this domain.
 */
export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/v1/users",
    { preHandler: [authenticate, requireRole("ADMIN")] },
    createUserController,
  );
  app.get(
    "/api/v1/users",
    { preHandler: [authenticate, requireRole("ADMIN", "SUPERVISOR")] },
    listUsersController,
  );
  app.get(
    "/api/v1/users/:id",
    { preHandler: [authenticate, requireRole("ADMIN", "SUPERVISOR")] },
    getUserController,
  );
  app.patch(
    "/api/v1/users/:id",
    { preHandler: [authenticate, requireRole("ADMIN")] },
    updateUserController,
  );
  app.post(
    "/api/v1/users/:id/deactivate",
    { preHandler: [authenticate, requireRole("ADMIN")] },
    deactivateUserController,
  );
  app.post(
    "/api/v1/users/:id/reactivate",
    { preHandler: [authenticate, requireRole("ADMIN")] },
    reactivateUserController,
  );
}