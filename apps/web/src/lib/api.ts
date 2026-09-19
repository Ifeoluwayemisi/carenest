import type { ApiEnvelope } from "@/types/api";

/**
 * API error raised when the backend returns a non-2xx response.
 * The shape mirrors the API error envelope documented in docs/API.md.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown[];

  constructor(status: number, code: string, message: string, details: unknown[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Base URL for the backend API, configured through NEXT_PUBLIC_API_URL.
 * See apps/web/.env.local.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function parseErrorBody(
  status: number,
  body: ApiEnvelope<unknown> | null,
): Promise<ApiError> {
  const error = body?.error;
  const code = error?.code ?? "UNKNOWN_ERROR";
  const message = error?.message ?? "The request failed unexpectedly.";
  const details = error?.details ?? [];
  return new ApiError(status, code, message, details);
}

/**
 * Small typed JSON fetch wrapper. Feature service modules (under src/services/)
 * should use this so URLs, headers, and error handling stay in one place.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw await parseErrorBody(response.status, body as ApiEnvelope<unknown> | null);
  }

  // Success responses use the { success: true, ...rest } envelope.
  return body as T;
}