import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { env } from "./config/env";
import { loggerOptions } from "./lib/logger";
import { registerErrorHandling } from "./middlewares/error-handler";
import { authRoutes } from "./routes/auth.route";
import { dashboardRoutes } from "./routes/dashboard.route";
import { docsRoutes } from "./routes/docs.route";
import { followUpRoutes } from "./routes/follow-ups.route";
import { healthRoutes } from "./routes/health.route";
import { patientRoutes } from "./routes/patients.route";
import { userRoutes } from "./routes/users.route";
import { visitRoutes } from "./routes/visits.route";
import { STT_LIMITS } from "./services/speech";

export interface BuildAppOptions {
  logger?: FastifyServerOptions["logger"];
}

/**
 * Builds a configured Fastify instance. No listening, no side effects, so
 * tests can inject requests directly against the app.
 */
export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? loggerOptions,
  });

  // CORS for local frontend development (Next.js dev server origin).
  void app.register(cors, {
    origin: [env.CLIENT_URL],
    credentials: true,
  });

  void app.register(multipart, {
    limits: { fileSize: STT_LIMITS.maxAudioBytes },
  });

  registerErrorHandling(app);

  void app.register(healthRoutes);
  void app.register(docsRoutes);
  void app.register(authRoutes);
  void app.register(userRoutes);
  void app.register(patientRoutes);
  void app.register(visitRoutes);
  void app.register(followUpRoutes);
  void app.register(dashboardRoutes);

  return app;
}