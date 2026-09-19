import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { buildApp } from "../src/app";
import { pool } from "../src/db/pool";
import { runMigrations } from "../src/db/migrate";
import { authenticate, requireRole } from "../src/middlewares/auth";
import { query } from "../src/db/pool";

const PASSWORD = "Correct-Horse-Battery-Staple-42";
const TEST_SECRET = process.env.JWT_SECRET as string;
const TOKEN_TTL_SECONDS = 12 * 60 * 60;

function signToken(userId: string, overrides: { exp?: number; secret?: string } = {}): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { sub: userId, iat: now, exp: overrides.exp ?? now + TOKEN_TTL_SECONDS },
    overrides.secret ?? TEST_SECRET,
  );
}

let app: FastifyInstance;
let orgId: string;
let adminId: string;
let chwId: string;
let disabledId: string;
let ghostId: string;

beforeAll(async () => {
  await runMigrations(pool);

  const org = await pool.query(
    `INSERT INTO organizations (name, slug)
     VALUES ('CareNest Test', 'carenest-test')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
  );
  orgId = org.rows[0].id as string;

  const passwordHash = bcrypt.hashSync(PASSWORD, 10);

  async function upsertUser(role: string, name: string, email: string, active: boolean): Promise<string> {
    const result = await pool.query(
      `INSERT INTO users (organization_id, role, name, email, password_hash, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (lower(email)) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role,
             name = EXCLUDED.name,
             active = EXCLUDED.active
       RETURNING id`,
      [orgId, role, name, email, passwordHash, active],
    );
    return result.rows[0].id as string;
  }

  adminId = await upsertUser("ADMIN", "Auth Admin", "auth-admin@carenest.test", true);
  chwId = await upsertUser("CHW", "Auth CHW", "auth-chw@carenest.test", true);
  disabledId = await upsertUser("ADMIN", "Disabled Admin", "auth-disabled@carenest.test", false);
  ghostId = await upsertUser("ADMIN", "Ghost Admin", "auth-ghost@carenest.test", true);

  app = buildApp({ logger: false });

  // Probe routes to exercise requireRole without touching feature routes.
  app.get(
    "/api/v1/test/admin-only",
    { preHandler: [authenticate, requireRole("ADMIN")] },
    async (_request, reply) => reply.send({ success: true, data: { ok: true } }),
  );
  app.get(
    "/api/v1/test/chw-or-supervisor",
    { preHandler: [authenticate, requireRole("CHW", "SUPERVISOR")] },
    async (_request, reply) => reply.send({ success: true, data: { ok: true } }),
  );
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

async function login(email: string, password: string) {
  return app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email, password },
  });
}

async function me(token?: string) {
  return app.inject({
    method: "GET",
    url: "/api/v1/auth/me",
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

describe("POST /api/v1/auth/login", () => {
  it("returns a token and the authenticated user for valid credentials", async () => {
    const response = await login("auth-admin@carenest.test", PASSWORD);

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toEqual(expect.any(String));
    expect(body.data.user).toEqual({
      id: adminId,
      organizationId: orgId,
      role: "ADMIN",
      name: "Auth Admin",
      email: "auth-admin@carenest.test",
      active: true,
    });
  });

  it("never exposes the password hash", async () => {
    const response = await login("auth-admin@carenest.test", PASSWORD);
    expect(response.json().data.user).not.toHaveProperty("passwordHash");
    expect(response.json().data.user).not.toHaveProperty("password_hash");
  });

  it("accepts email case-insensitively", async () => {
    const response = await login("AUTH-ADMIN@CARENEST.TEST", PASSWORD);
    expect(response.statusCode).toBe(200);
    expect(response.json().data.user.email).toBe("auth-admin@carenest.test");
  });

  it("issues a JWT with a 12-hour expiry and minimal payload", async () => {
    const response = await login("auth-admin@carenest.test", PASSWORD);
    interface Claims {
      sub?: string;
      iat?: number;
      exp?: number;
    }
    const payload = jwt.decode(response.json().data.token) as Claims;
    expect(payload.exp).toBeDefined();
    expect(payload.iat).toBeDefined();
    expect(payload.sub).toBe(adminId);
    expect((payload.exp as number) - (payload.iat as number)).toBe(TOKEN_TTL_SECONDS);
    expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "sub"]);
  });

  it("does not accept organizationId from the request body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "auth-admin@carenest.test",
        password: PASSWORD,
        organizationId: "00000000-0000-0000-0000-000000000000",
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.user.organizationId).toBe(orgId);
  });

  it("rejects a wrong password with 401 UNAUTHORIZED", async () => {
    const response = await login("auth-admin@carenest.test", "wrong-password");
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("rejects an unknown email with 401 UNAUTHORIZED", async () => {
    const response = await login("nobody@carenest.test", PASSWORD);
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("returns the same error for unknown email and wrong password", async () => {
    const unknown = await login("nobody@carenest.test", PASSWORD);
    const wrong = await login("auth-admin@carenest.test", "wrong-password");
    expect(unknown.json()).toEqual(wrong.json());
  });

  it("rejects missing credentials with 400 VALIDATION_ERROR", async () => {
    const response = await login("auth-admin@carenest.test", "");
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("rejects a deactivated account at login with 403 FORBIDDEN", async () => {
    const response = await login("auth-disabled@carenest.test", PASSWORD);
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "FORBIDDEN" },
    });
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns the authenticated user for a valid token", async () => {
    const response = await me(signToken(adminId));
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: true,
      data: {
        id: adminId,
        organizationId: orgId,
        role: "ADMIN",
        name: "Auth Admin",
        email: "auth-admin@carenest.test",
        active: true,
      },
    });
  });

  it("returns 401 when no Authorization header is present", async () => {
    const response = await me();
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("returns 401 for a malformed Authorization header", async () => {
    const response = await me("not-a-bearer-token");
    expect(response.statusCode).toBe(401);
  });

  it("returns 401 for a non-JWT bearer token", async () => {
    const response = await me("garbage.token.value");
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("returns 401 for an empty bearer token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: "Bearer " },
    });
    expect(response.statusCode).toBe(401);
  });

  it("returns 401 for a token signed with the wrong secret", async () => {
    const token = signToken(adminId, {
      secret: "a-different-test-secret-that-is-also-very-long-32-plus",
    });
    const response = await me(token);
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("returns 401 for a token that is missing the sub claim", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      { iat: now, exp: now + TOKEN_TTL_SECONDS },
      TEST_SECRET,
    );
    const response = await me(token);
    expect(response.statusCode).toBe(401);
  });

  it("returns 401 for an expired token", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signToken(adminId, { exp: now - 1000 });
    const response = await me(token);
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("returns 403 for a deactivated account even with a valid token", async () => {
    const response = await me(signToken(disabledId));
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("returns 401 for a user that no longer exists (token sub removed)", async () => {
    await query("DELETE FROM users WHERE id = $1", [ghostId]);
    const response = await me(signToken(ghostId));
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });
});

describe("requireRole guard", () => {
  it("returns 200 for an ADMIN on an admin-only route", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/test/admin-only",
      headers: { authorization: `Bearer ${signToken(adminId)}` },
    });
    expect(response.statusCode).toBe(200);
  });

  it("returns 403 for a CHW on an admin-only route", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/test/admin-only",
      headers: { authorization: `Bearer ${signToken(chwId)}` },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("returns 403 for an ADMIN on a CHW-or-supervisor route", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/test/chw-or-supervisor",
      headers: { authorization: `Bearer ${signToken(adminId)}` },
    });
    expect(response.statusCode).toBe(403);
  });

  it("returns 401 when unauthenticated on a role-guarded route", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/test/admin-only",
    });
    expect(response.statusCode).toBe(401);
  });
});