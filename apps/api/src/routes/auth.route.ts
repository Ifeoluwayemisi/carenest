import type { FastifyInstance } from "fastify";
import { loginController, meController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/auth/login", loginController);
  app.get("/api/v1/auth/me", { preHandler: [authenticate] }, meController);
}