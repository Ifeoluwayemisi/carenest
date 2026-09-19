/**
 * Persists the bearer token across page reloads. localStorage (not
 * sessionStorage) so a CHW mid-shift isn't logged out by closing the tab —
 * matches the offline-first, field-use product requirement. The token is a
 * short-lived JWT (12h, per the backend's auth contract); GET /auth/me
 * re-validates it against the database on every app boot, so a stale/
 * revoked token is caught immediately rather than trusted client-side.
 */
const TOKEN_KEY = "carenest_token";

function isClient(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getToken(): string | null {
  if (!isClient()) return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage unavailable (private mode, quota) — auth simply won't persist
    // across reloads; the session still works for the current page load.
  }
}

export function clearToken(): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}
