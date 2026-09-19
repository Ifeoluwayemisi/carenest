import { apiFetch } from "@/lib/api";
import type { AuthUser } from "@/types/domain";

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const body = await apiFetch<{ success: true; data: LoginResponse }>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
  return body.data;
}

export async function me(): Promise<AuthUser> {
  const body = await apiFetch<{ success: true; data: AuthUser }>("/api/v1/auth/me");
  return body.data;
}
