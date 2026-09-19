import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { buildApp } from "../src/app";
import { pool } from "../src/db/pool";
import { runMigrations } from "../src/db/migrate";

const PASSWORD = "Initial-CareNest-Password-42";
const RUN_TAG = randomUUID();
const NEW_CHW_EMAIL = `users-a-newchw-${RUN_TAG}@carenest.test`;
const HIJACK_EMAIL = `users-a-hijack-${RUN_TAG}@carenest.test`;
const TEST_SECRET = process.env.JWT_SECRET as string;
const TOKEN_TTL_SECONDS = 12 * 60 * 60;

function signToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({ sub: userId, iat: now, exp: now + TOKEN_TTL_SECONDS }, TEST_SECRET);
}

const authHeaders = (token: string) => ({ authorization: `Bearer ${token}` });

let app: FastifyInstance;
let orgA: string;
let orgB: string;
let adminA: string;
let chwA: string;
let supA: string;
let adminB: string;

beforeAll(async () => {
  await runMigrations(pool);

  const orgResult = await pool.query(
    `INSERT INTO organizations (name, slug)
     VALUES ('Users Test Org A', 'carenest-users-test-a')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
  );
  orgA = orgResult.rows[0].id as string;

  const orgBResult = await pool.query(
    `INSERT INTO organizations (name, slug)
     VALUES ('Users Test Org B', 'carenest-users-test-b')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
  );
  orgB = orgBResult.rows[0].id as string;

  const passwordHash = bcrypt.hashSync(PASSWORD, 10);

  async function upsertUser(
    orgId: string,
    role: string,
    name: string,
    email: string,
  ): Promise<string> {
    const result = await pool.query(
      `INSERT INTO users (organization_id, role, name, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (lower(email)) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role,
             name = EXCLUDED.name
       RETURNING id`,
      [orgId, role, name, email, passwordHash],
    );
    return result.rows[0].id as string;
  }

  adminA = await upsertUser(orgA, "ADMIN", "Users Admin A", "users-a-admin@carenest.test");
  chwA = await upsertUser(orgA, "CHW", "Users CHW A", "users-a-chw@carenest.test");
  supA = await upsertUser(orgA, "SUPERVISOR", "Users Sup A", "users-a-sup@carenest.test");
  adminB = await upsertUser(orgB, "ADMIN", "Users Admin B", "users-b-admin@carenest.test");

  app = buildApp({ logger: false });
}, 30_000);

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email IN ($1, $2)", [
    NEW_CHW_EMAIL,
    HIJACK_EMAIL,
  ]);
  await app.close();
  await pool.end();
}, 30_000);

describe("POST /api/v1/users — ADMIN creates a CHW", () => {
  it("creates a CHW with the provided initial password", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: authHeaders(signToken(adminA)),
      payload: {
        name: "New CHW",
        email: NEW_CHW_EMAIL,
        password: PASSWORD,
        phone: "+2348000000000",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.user).toMatchObject({
      organizationId: orgA,
      role: "CHW",
      name: "New CHW",
      email: NEW_CHW_EMAIL,
      phone: "+2348000000000",
      active: true,
    });
    expect(body.data.user).not.toHaveProperty("passwordHash");
    expect(body.data.user).not.toHaveProperty("password_hash");
  });

  it("created CHW can log in with the initial password", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: NEW_CHW_EMAIL, password: PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().data.user.role).toBe("CHW");
  });

  it("rejects a duplicate email case-insensitively with 409 CONFLICT", async () => {
    for (const email of [
      NEW_CHW_EMAIL.toUpperCase(),
      "users-a-admin@carenest.test",
    ]) {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/users",
        headers: authHeaders(signToken(adminA)),
        payload: { name: "Dup", email, password: PASSWORD },
      });
      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({
        success: false,
        error: { code: "CONFLICT" },
      });
    }
  });

  it("ignores organizationId and role from the request body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: authHeaders(signToken(adminA)),
      payload: {
        name: "Hijack CHW",
        email: HIJACK_EMAIL,
        password: PASSWORD,
        organizationId: orgB,
        role: "ADMIN",
      },
    });

    expect(response.statusCode).toBe(201);
    const user = response.json().data.user;
    expect(user.organizationId).toBe(orgA);
    expect(user.role).toBe("CHW");
  });

  it("does not surface hijacked users to the other organization", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/users",
      headers: authHeaders(signToken(adminB)),
    });
    expect(response.statusCode).toBe(200);
    const emails = response.json().data.users.map((u: { email: string }) => u.email);
    expect(emails).not.toContain(HIJACK_EMAIL);
  });

  it("rejects a short password with 400 VALIDATION_ERROR", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: authHeaders(signToken(adminA)),
      payload: { name: "Short", email: "users-a-short@carenest.test", password: "tiny" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("rejects a malformed email with 400 VALIDATION_ERROR", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: authHeaders(signToken(adminA)),
      payload: { name: "Bad", email: "not-an-email", password: PASSWORD },
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("GET /api/v1/users — ADMIN/SUPERVISOR list and view", () => {
  it("lists all organization users for an ADMIN", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/users",
      headers: authHeaders(signToken(adminA)),
    });
    expect(response.statusCode).toBe(200);
    const users = response.json().data.users as Array<{ role: string; email: string }>;
    expect(users.length).toBeGreaterThanOrEqual(4);
    expect(users.map((u) => u.email)).toContain(NEW_CHW_EMAIL);
  });

  it("filters by role via the role query parameter", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/users?role=CHW",
      headers: authHeaders(signToken(adminA)),
    });
    const users = response.json().data.users as Array<{ role: string }>;
    expect(users.length).toBeGreaterThan(0);
    expect(users.every((u) => u.role === "CHW")).toBe(true);
  });

  it("lets a SUPERVISOR read users", async () => {
    const list = await app.inject({
      method: "GET",
      url: "/api/v1/users",
      headers: authHeaders(signToken(supA)),
    });
    expect(list.statusCode).toBe(200);

    const view = await app.inject({
      method: "GET",
      url: `/api/v1/users/${chwA}`,
      headers: authHeaders(signToken(supA)),
    });
    expect(view.statusCode).toBe(200);
    expect(view.json().data.user.id).toBe(chwA);
  });

  it("blocks a CHW from listing or viewing users", async () => {
    const list = await app.inject({
      method: "GET",
      url: "/api/v1/users",
      headers: authHeaders(signToken(chwA)),
    });
    expect(list.statusCode).toBe(403);
    const view = await app.inject({
      method: "GET",
      url: `/api/v1/users/${adminA}`,
      headers: authHeaders(signToken(chwA)),
    });
    expect(view.statusCode).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/users" });
    expect(response.statusCode).toBe(401);
  });

  it("returns 400 for a malformed user id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/users/not-a-uuid",
      headers: authHeaders(signToken(adminA)),
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("hides other-organization users as 404", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/users/${adminB}`,
      headers: authHeaders(signToken(adminA)),
    });
    expect(response.statusCode).toBe(404);
  });
});

describe("PATCH /api/v1/users/:id — ADMIN updates a CHW", () => {
  it("updates name and phone", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/users/${chwA}`,
      headers: authHeaders(signToken(adminA)),
      payload: { name: "Updated CHW", phone: "+2348111222333" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.user).toMatchObject({
      id: chwA,
      name: "Updated CHW",
      phone: "+2348111222333",
    });
  });

  it("resets the password so the CHW can log in with it", async () => {
    const resetPassword = "Brand-New-Safe-Password-99";
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/users/${chwA}`,
      headers: authHeaders(signToken(adminA)),
      payload: { password: resetPassword },
    });
    expect(response.statusCode).toBe(200);

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "users-a-chw@carenest.test", password: resetPassword },
    });
    expect(login.statusCode).toBe(200);
  });

  it("rejects an email conflict with 409 CONFLICT", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/users/${chwA}`,
      headers: authHeaders(signToken(adminA)),
      payload: { email: NEW_CHW_EMAIL },
    });
    expect(response.statusCode).toBe(409);
  });

  it("cannot update another organization's user (404)", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/users/${adminB}`,
      headers: authHeaders(signToken(adminA)),
      payload: { name: "Nope" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("blocks a SUPERVISOR and a CHW from updating", async () => {
    const supPatch = await app.inject({
      method: "PATCH",
      url: `/api/v1/users/${chwA}`,
      headers: authHeaders(signToken(supA)),
      payload: { name: "Nope" },
    });
    expect(supPatch.statusCode).toBe(403);

    const chwPatch = await app.inject({
      method: "PATCH",
      url: `/api/v1/users/${adminA}`,
      headers: authHeaders(signToken(chwA)),
      payload: { name: "Nope" },
    });
    expect(chwPatch.statusCode).toBe(403);
  });
});

describe("POST /api/v1/users/:id/deactivate|reactivate — ADMIN lifecycle", () => {
  it("deactivates then reactivates a CHW", async () => {
    const deactivate = await app.inject({
      method: "POST",
      url: `/api/v1/users/${chwA}/deactivate`,
      headers: authHeaders(signToken(adminA)),
    });
    expect(deactivate.statusCode).toBe(200);
    expect(deactivate.json().data.user.active).toBe(false);

    const reactivate = await app.inject({
      method: "POST",
      url: `/api/v1/users/${chwA}/reactivate`,
      headers: authHeaders(signToken(adminA)),
    });
    expect(reactivate.statusCode).toBe(200);
    expect(reactivate.json().data.user.active).toBe(true);
  });

  it("deactivated CHW immediately loses access via an existing JWT", async () => {
    const chwToken = signToken(chwA);

    await app.inject({
      method: "POST",
      url: `/api/v1/users/${chwA}/deactivate`,
      headers: authHeaders(signToken(adminA)),
    });

    const before = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: authHeaders(chwToken),
    });
    expect(before.statusCode).toBe(403);
    expect(before.json()).toMatchObject({
      success: false,
      error: { code: "FORBIDDEN" },
    });

    await app.inject({
      method: "POST",
      url: `/api/v1/users/${chwA}/reactivate`,
      headers: authHeaders(signToken(adminA)),
    });

    const after = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: authHeaders(chwToken),
    });
    expect(after.statusCode).toBe(200);
  });

  it("prevents an admin from deactivating their own account", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/users/${adminA}/deactivate`,
      headers: authHeaders(signToken(adminA)),
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("cannot deactivate/reactivate another organization's user (404)", async () => {
    const deactivate = await app.inject({
      method: "POST",
      url: `/api/v1/users/${adminB}/deactivate`,
      headers: authHeaders(signToken(adminA)),
    });
    expect(deactivate.statusCode).toBe(404);

    const reactivate = await app.inject({
      method: "POST",
      url: `/api/v1/users/${adminB}/reactivate`,
      headers: authHeaders(signToken(adminA)),
    });
    expect(reactivate.statusCode).toBe(404);
  });

  it("blocks SUPERVISOR and CHW from deactivating users", async () => {
    const sup = await app.inject({
      method: "POST",
      url: `/api/v1/users/${chwA}/deactivate`,
      headers: authHeaders(signToken(supA)),
    });
    expect(sup.statusCode).toBe(403);

    const chw = await app.inject({
      method: "POST",
      url: `/api/v1/users/${adminA}/deactivate`,
      headers: authHeaders(signToken(chwA)),
    });
    expect(chw.statusCode).toBe(403);
  });

  it("returns 404 for an unknown user id", async () => {
    const unknownId = "00000000-0000-4000-8000-000000000000";
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/users/${unknownId}/deactivate`,
      headers: authHeaders(signToken(adminA)),
    });
    expect(response.statusCode).toBe(404);
  });
});