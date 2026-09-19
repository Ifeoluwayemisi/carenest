import type { FastifyInstance } from "fastify";
import type { ZodError } from "zod";
import { AppError, ValidationFailedError } from "../lib/errors";

/**
 * Central error handling: every route/controller error flows through here and
 * is normalized into the documented error envelope (docs/API.md).
 */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Route not found: ${request.method} ${request.url}`,
      },
    });
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ValidationFailedError || error instanceof AppError) {
      reply.status(error.status).send({
        success: false,
        error: { code: error.code, message: error.message, details: error.details },
      });
      return;
    }

    // Zod validation failures that bypass the validate() helper still get a
    // consistent VALIDATION_ERROR response.
    const zodError = error as ZodError;
    if (Array.isArray(zodError.issues)) {
      const details = zodError.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      request.log.warn({ err: error }, "Unhandled Zod validation failure");
      reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Request validation failed", details },
      });
      return;
    }

    // Let Fastify's own 4xx errors (e.g. invalid JSON body) keep their status.
    const fastifyError = error as { message?: string; statusCode?: number };
    const statusCode = fastifyError.statusCode;
    if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 500) {
      reply.status(statusCode).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: fastifyError.message ?? "Bad request" },
      });
      return;
    }

    request.log.error({ err: error }, "Unhandled error");
    reply.status(500).send({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  });
}