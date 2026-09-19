import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env";
import { loggerOptions } from "./lib/logger";
import { registerErrorHandling } from "./middlewares/error-handler";
import { authRoutes } from "./routes/auth.route";
import { healthRoutes } from "./routes/health.route";

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

  registerErrorHandling(app);

  void app.register(healthRoutes);
  void app.register(authRoutes);

  return app;
}