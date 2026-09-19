import type { ZodError } from "zod";
import type { ErrorCode } from "../types/api";

/**
 * Base application error carrying an HTTP status and a stable machine-readable
 * code matching the API error envelope in docs/API.md.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: unknown[];

  constructor(status: number, code: ErrorCode, message: string, details: unknown[] = []) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationFailedError extends AppError {
  constructor(details: unknown[]) {
    super(400, "VALIDATION_ERROR", "Request validation failed", details);
    this.name = "ValidationFailedError";
  }

  static fromZod(error: ZodError): ValidationFailedError {
    const details = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return new ValidationFailedError(details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
    this.name = "NotFoundError";
  }
}