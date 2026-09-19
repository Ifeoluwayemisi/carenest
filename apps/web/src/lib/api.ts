import type { ApiEnvelope } from "@/types/api";
import { clearToken, getToken } from "./auth-storage";

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

/** Fired on window when a request comes back 401 — AuthContext listens for
 * this to force a logout/redirect-to-login without every call site having to
 * know about auth state. */
export const UNAUTHORIZED_EVENT = "carenest:unauthorized";

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
 * Small typed fetch wrapper. Feature service modules (under src/services/)
 * should use this so URLs, headers, auth, and error handling stay in one
 * place. Attaches the bearer token automatically when present. Body may be a
 * plain object (sent as JSON) or a FormData instance (sent as multipart —
 * the browser sets its own Content-Type with boundary, so we must NOT set
 * one ourselves in that case, or the multipart upload breaks).
 */
export async function apiFetch<T>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  const token = getToken();
  const isFormData = init?.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init?.headers as Record<string, string>) ?? {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    body: isFormData
      ? (init?.body as FormData)
      : init?.body !== undefined
        ? JSON.stringify(init.body)
        : undefined,
  });

  const body = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      clearToken();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    throw await parseErrorBody(response.status, body as ApiEnvelope<unknown> | null);
  }

  // Success responses use the { success: true, ...rest } envelope.
  return body as T;
}