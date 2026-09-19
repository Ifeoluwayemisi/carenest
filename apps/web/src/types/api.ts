/**
 * Shared API contract types.
 *
 * These mirror the documented API contracts in docs/API.md. Keep them aligned
 * when the backend response shapes change.
 */

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown[];
}

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiErrorBody;
}

export interface HealthResponse {
  success: boolean;
  message: string;
}