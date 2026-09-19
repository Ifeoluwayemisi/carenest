import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { buildApp } from "../src/app";
import { pool } from "../src/db/pool";
import { runMigrations } from "../src/db/migrate";

const PASSWORD = "Correct-Horse-Battery-Staple-42";
const TEST_SECRET = process.env.JWT_SECRET as string;
const TOKEN_TTL_SECONDS = 12 * 60 * 60;
const TAG = Date.now().toString(36);

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

beforeAll(async () => {
  await runMigrations(pool);

  const orgResult = await pool.query(
    `INSERT INTO organizations (name, slug)
     VALUES ('Patients Test Org A', 'carenest-patients-test-a')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
  );
  orgA = orgResult.rows[0].id as string;

  const orgBResult = await pool.query(
    `INSERT INTO organizations (name, slug)
     VALUES ('Patients Test Org B', 'carenest-patients-test-b')
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

  adminA = await upsertUser(orgA, "ADMIN", "Patients Admin A", "patients-a-admin@carenest.test");
  chwA = await upsertUser(orgA, "CHW", "Patients CHW A", "patients-a-chw@carenest.test");
  supA = await upsertUser(orgA, "SUPERVISOR", "Patients Sup A", "patients-a-sup@carenest.test");
  await upsertUser(orgB, "CHW", "Patients CHW B", "patients-b-chw@carenest.test");

  app = buildApp({ logger: false });
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

async function insertPatient(
  orgId: string,
  overrides: Partial<{
    firstName: string;
    lastName: string;
    uniqueId: string | null;
    phone: string | null;
    clientGeneratedId: string | null;
  }> = {},
): Promise<string> {
  const result = await pool.query(
    `INSERT INTO patients
       (organization_id, unique_id, first_name, last_name, phone, client_generated_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      orgId,
      overrides.uniqueId ?? null,
      overrides.firstName ?? "Seed",
      overrides.lastName ?? "Patient",
      overrides.phone ?? null,
      overrides.clientGeneratedId ?? null,
    ],
  );
  return result.rows[0].id as string;
}

describe("POST /api/v1/patients — CHW/ADMIN create", () => {
  it("lets a CHW create an organization patient", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/patients",
      headers: authHeaders(signToken(chwA)),
      payload: {
        firstName: "Adaeze",
        lastName: "Okafor",
        dateOfBirth: "1990-03-14",
        gender: "female",
        phone: "+2348123456789",
        address: "12 Unity Road, Abuja",
      },
    });

    expect(response.statusCode).toBe(201);
    const patient = response.json().data.patient;
    expect(patient.organizationId).toBe(orgA);
    expect(patient.createdBy).toBe(chwA);
    expect(patient).toMatchObject({
      firstName: "Adaeze",
      lastName: "Okafor",
      dateOfBirth: "1990-03-14",
      gender: "female",
    });
  });

  it("lets an ADMIN create an organization patient", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/patients",
      headers: authHeaders(signToken(adminA)),
      payload: { firstName: "Chidi", lastName: "Eze" },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().data.patient.createdBy).toBe(adminA);
  });

  it("ignores organizationId from the request body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/patients",
      headers: authHeaders(signToken(chwA)),
      payload: {
        firstName: "Hijack",
        lastName: "Patient",
        organizationId: orgB,
      },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().data.patient.organizationId).toBe(orgA);
  });

  it("is idempotent for a repeated client_generated_id", async () => {
    const clientGeneratedId = randomUUID();
    const payload = {
      firstName: "Ngozi",
      lastName: "Adebayo",
      clientGeneratedId,
    };

    const first = await app.inject({
      method: "POST",
      url: "/api/v1/patients",
      headers: authHeaders(signToken(chwA)),
      payload,
    });
    expect(first.statusCode).toBe(201);
    const patientId = first.json().data.patient.id;

    const second = await app.inject({
      method: "POST",
      url: "/api/v1/patients",
      headers: authHeaders(signToken(chwA)),
      payload,
    });
    expect(second.statusCode).toBe(201);
    expect(second.json().data.patient.id).toBe(patientId);

    const count = await pool.query<{ c: number }>(
      "SELECT count(*)::int AS c FROM patients WHERE organization_id = $1 AND client_generated_id = $2",
      [orgA, clientGeneratedId],
    );
    expect(count.rows[0].c).toBe(1);
  });

  it("reuses a client_generated_id across organizations without collision", async () => {
    const clientGeneratedId = randomUUID();
    const inA = await app.inject({
      method: "POST",
      url: "/api/v1/patients",
      headers: authHeaders(signToken(chwA)),
      payload: { firstName: "Org A Sync", lastName: "Case", clientGeneratedId },
    });
    const inB = await app.inject({
      method: "POST",
      url: "/api/v1/patients",
      headers: authHeaders(signToken((await pool.query(
        "SELECT id::text FROM users WHERE email = 'patients-b-chw@carenest.test' LIMIT 1",
      )).rows[0].id as string)),
      payload: { firstName: "Org B Sync", lastName: "Case", clientGeneratedId },
    });

    expect(inA.statusCode).toBe(201);
    expect(inB.statusCode).toBe(201);
    expect(inA.json().data.patient.id).not.toBe(inB.json().data.patient.id);
  });

  it("blocks SUPERVISOR from creating patients (403)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/patients",
      headers: authHeaders(signToken(supA)),
      payload: { firstName: "No", lastName: "Create" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/patients",
      payload: { firstName: "No", lastName: "Token" },
    });
    expect(response.statusCode).toBe(401);
  });

  it("rejects malformed input with 400 VALIDATION_ERROR", async () => {
    const cases = [
      { firstName: "Missing last name" },
      { firstName: "Bad", lastName: "Date", dateOfBirth: "2026-02-31" },
      { firstName: "Bad", lastName: "Uuid", clientGeneratedId: "not-a-uuid" },
    ];
    for (const payload of cases) {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/patients",
        headers: authHeaders(signToken(chwA)),
        payload,
      });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        success: false,
        error: { code: "VALIDATION_ERROR" },
      });
    }
  });
});

describe("GET /api/v1/patients — organization-scoped reads", () => {
  it("lets a CHW list organization patients", async () => {
    await insertPatient(orgA, { firstName: `Listed${TAG}`, lastName: "Patient" });
    const list = await app.inject({
      method: "GET",
      url: "/api/v1/patients",
      headers: authHeaders(signToken(chwA)),
    });
    expect(list.statusCode).toBe(200);
    const patients = list.json().data.patients as Array<{ organizationId: string }>;
    expect(patients.length).toBeGreaterThan(0);
    expect(patients.every((p) => p.organizationId === orgA)).toBe(true);
  });

  it("filters by a search term", async () => {
    const lastName = `Searchable${TAG}`;
    await insertPatient(orgA, { firstName: "Find", lastName });
    const list = await app.inject({
      method: "GET",
      url: `/api/v1/patients?search=${lastName}`,
      headers: authHeaders(signToken(chwA)),
    });
    expect(list.statusCode).toBe(200);
    const patients = list.json().data.patients as Array<{ lastName: string }>;
    expect(patients.some((p) => p.lastName === lastName)).toBe(true);
  });

  it("lets every role read a patient by id", async () => {
    const patientId = await insertPatient(orgA, {
      firstName: "Readable",
      lastName: `ByAll${TAG}`,
    });
    for (const token of [signToken(chwA), signToken(adminA), signToken(supA)]) {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/patients/${patientId}`,
        headers: authHeaders(token),
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().data.patient.id).toBe(patientId);
    }
  });

  it("hides other-organization patients as 404 (CHW)", async () => {
    const foreignPatient = await insertPatient(orgB, {
      firstName: "Foreign",
      lastName: "Patient",
    });
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/patients/${foreignPatient}`,
      headers: authHeaders(signToken(chwA)),
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 404 for an unknown patient id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/patients/00000000-0000-4000-8000-000000000000",
      headers: authHeaders(signToken(chwA)),
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 400 for a malformed patient id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/patients/not-a-uuid",
      headers: authHeaders(signToken(chwA)),
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("PATCH /api/v1/patients/:id — CHW/ADMIN update", () => {
  it("lets a CHW update one of their organization's patients", async () => {
    const patientId = await insertPatient(orgA, {
      firstName: "ToUpdate",
      lastName: `Patient${TAG}`,
      phone: "+2347000000000",
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/patients/${patientId}`,
      headers: authHeaders(signToken(chwA)),
      payload: { firstName: "Updated", phone: "+2347777777777", gender: "female" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.patient).toMatchObject({
      id: patientId,
      firstName: "Updated",
      phone: "+2347777777777",
      gender: "female",
    });
  });

  it("clears an optional field when set to null", async () => {
    const patientId = await insertPatient(orgA, {
      firstName: "ClearMe",
      lastName: "Patient",
      phone: "+234788888888",
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/patients/${patientId}`,
      headers: authHeaders(signToken(chwA)),
      payload: { phone: null },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.patient.phone).toBeNull();
  });

  it("lets an ADMIN update an organization patient", async () => {
    const patientId = await insertPatient(orgA, {
      firstName: "AdminEdit",
      lastName: "Patient",
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/patients/${patientId}`,
      headers: authHeaders(signToken(adminA)),
      payload: { lastName: "UpdatedByAdmin" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.patient.lastName).toBe("UpdatedByAdmin");
  });

  it("cannot update another organization's patient (404)", async () => {
    const foreignPatient = await insertPatient(orgB, {
      firstName: "Foreign",
      lastName: "Update",
    });
    const chw = await app.inject({
      method: "PATCH",
      url: `/api/v1/patients/${foreignPatient}`,
      headers: authHeaders(signToken(chwA)),
      payload: { firstName: "Nope" },
    });
    expect(chw.statusCode).toBe(404);

    const admin = await app.inject({
      method: "PATCH",
      url: `/api/v1/patients/${foreignPatient}`,
      headers: authHeaders(signToken(adminA)),
      payload: { firstName: "Nope" },
    });
    expect(admin.statusCode).toBe(404);
  });

  it("blocks SUPERVISOR from updating patients (403)", async () => {
    const patientId = await insertPatient(orgA, {
      firstName: "ReadOnly",
      lastName: "Patient",
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/patients/${patientId}`,
      headers: authHeaders(signToken(supA)),
      payload: { firstName: "Nope" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("rejects malformed update input with 400 VALIDATION_ERROR", async () => {
    const patientId = await insertPatient(orgA, {
      firstName: "BadPatch",
      lastName: "Patient",
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/patients/${patientId}`,
      headers: authHeaders(signToken(chwA)),
      payload: { dateOfBirth: "1999-99-99" },
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("Deactivated CHW loses access to patients", () => {
  it("returns 403 with an existing JWT after deactivation, 200 after reactivation", async () => {
    const chwToken = signToken(chwA);

    await app.inject({
      method: "POST",
      url: `/api/v1/users/${chwA}/deactivate`,
      headers: authHeaders(signToken(adminA)),
    });

    const denied = await app.inject({
      method: "GET",
      url: "/api/v1/patients",
      headers: authHeaders(chwToken),
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.json()).toMatchObject({
      success: false,
      error: { code: "FORBIDDEN" },
    });

    await app.inject({
      method: "POST",
      url: `/api/v1/users/${chwA}/reactivate`,
      headers: authHeaders(signToken(adminA)),
    });

    const allowed = await app.inject({
      method: "GET",
      url: "/api/v1/patients",
      headers: authHeaders(chwToken),
    });
    expect(allowed.statusCode).toBe(200);
  });
});