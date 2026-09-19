import { readFileSync } from "node:fs";

// Deterministic env for tests, independent of the developer's .env (which
// env.ts would otherwise load via dotenv — including GROQ_API_KEY, breaking the
// AI engine's PROVIDER_NOT_CONFIGURED expectation). Pointing DOTENV_CONFIG_PATH
// at a missing file makes any later dotenv/config() in this process inject
// nothing, so the values below always win.
process.env.DOTENV_CONFIG_PATH = "tests/.env-disabled-for-tests";
process.env.DOTENV_CONFIG_QUIET = "true";

process.env.NODE_ENV = "test";
process.env.PORT = "4500";
process.env.LOG_LEVEL = "silent";
process.env.CLIENT_URL = "http://localhost:3000";
process.env.JWT_SECRET = "test-only-secret-that-is-definitely-longer-than-32-characters";

/** Minimal .env reader used only for TEST_DATABASE_URL (dotenv stays disabled). */
function dotenvValue(key: string): string | undefined {
  try {
    const raw = readFileSync(".env", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      if (trimmed.slice(0, eq).trim() === key) {
        return trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env may be absent (e.g. CI); DATABASE_URL falls back below.
  }
  return undefined;
}

// DB-backed tests (auth) need a reachable database. Point TEST_DATABASE_URL at
// a dedicated test database (e.g. a separate Neon database); if it is missing,
// tests fall back to a local URL and DB-backed suites will fail to connect with
// a clear pg error rather than silently skipping.
process.env.DATABASE_URL =
  dotenvValue("TEST_DATABASE_URL") ?? "postgresql://test:test@localhost:5432/carenest_test";