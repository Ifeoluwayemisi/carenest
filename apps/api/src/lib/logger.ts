import pino from "pino";
import { env } from "../config/env";

/** Pino redact paths for fields that must never appear in plaintext logs. */
export const REDACT_PATHS = [
  // Request metadata
  "req.headers.authorization",
  "req.headers.cookie",
  // Credentials wherever they are logged
  "password",
  "*.password",
  "password_hash",
  "*.password_hash",
  "passwordHash",
  "*.passwordHash",
  // Health transcripts / patient audio content
  "transcript",
  "*.transcript",
];

/**
 * Shared Fastify/pino logger options: level from config plus redaction so
 * credentials and patient transcripts are censored in logs.
 */
export const loggerOptions = {
  level: env.LOG_LEVEL,
  redact: { paths: REDACT_PATHS, censor: "[REDACTED]" },
};

export const logger = pino(loggerOptions);