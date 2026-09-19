/**
 * Shared API contract types. Keep these aligned with docs/API.md.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown[];
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
}

export interface ApiErrorEnvelope {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export interface HealthResponse {
  success: boolean;
  message: string;
}