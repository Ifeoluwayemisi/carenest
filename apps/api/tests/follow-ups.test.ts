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

function signToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({ sub: userId, iat: now, exp: now + TOKEN_TTL_SECONDS }, TEST_SECRET);
}

const authHeaders = (token: string) => ({ authorization: `Bearer ${token}` });

const RUN_TAG = randomUUID().slice(0, 8);

let app: FastifyInstance;
let orgA: string;
let orgB: string;
let chwA: string;
let supA: string;
let chwB: string;
let userB: string;
let patientA: string;
let patientB: string;
let visitA: string;
let visitB: string;

beforeAll(async () => {
  await runMigrations(pool);

  const orgResult = await pool.query(
    `INSERT INTO organizations (name, slug)
     VALUES ('Follow-ups Test Org A', $1)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [`carenest-followups-a-${RUN_TAG}`],
  );
  orgA = orgResult.rows[0].id as string;

  const orgBResult = await pool.query(
    `INSERT INTO organizations (name, slug)
     VALUES ('Follow-ups Test Org B', $1)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [`carenest-followups-b-${RUN_TAG}`],
  );
  orgB = orgBResult.rows[0].id as string;

  const passwordHash = bcrypt.hashSync(PASSWORD, 10);

  async function upsertUser(orgId: string, role: string, name: string, email: string): Promise<string> {
    const result = await pool.query(
      `INSERT INTO users (organization_id, role, name, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [orgId, role, name, email, passwordHash],
    );
    return result.rows[0].id as string;
  }

  chwA = await upsertUser(orgA, "CHW", "Follow-ups CHW A", `fu-a-chw@carenest-${RUN_TAG}.test`);
  supA = await upsertUser(orgA, "SUPERVISOR", "Follow-ups Sup A", `fu-a-sup@carenest-${RUN_TAG}.test`);
  chwB = await upsertUser(orgB, "CHW", "Follow-ups CHW B", `fu-b-chw@carenest-${RUN_TAG}.test`);
  userB = await upsertUser(orgB, "CHW", "Follow-ups User B", `fu-b-user@carenest-${RUN_TAG}.test`);

  const patientResult = await pool.query(
    `INSERT INTO patients (organization_id, first_name, last_name, date_of_birth, gender)
     VALUES ($1, 'Adaeze', 'Okonkwo', '1988-06-01', 'female')
     RETURNING id`,
    [orgA],
  );
  patientA = patientResult.rows[0].id as string;

  const patientBResult = await pool.query(
    `INSERT INTO patients (organization_id, first_name, last_name, date_of_birth, gender)
     VALUES ($1, 'Ibrahim', 'Sani', '1995-11-20', 'male')
     RETURNING id`,
    [orgB],
  );
  patientB = patientBResult.rows[0].id as string;

  const visitResult = await pool.query(
    `INSERT INTO visits (organization_id, patient_id, chw_id, visited_at)
     VALUES ($1, $2, $3, now())
     RETURNING id`,
    [orgA, patientA, chwA],
  );
  visitA = visitResult.rows[0].id as string;

  const visitBResult = await pool.query(
    `INSERT INTO visits (organization_id, patient_id, chw_id, visited_at)
     VALUES ($1, $2, $3, now())
     RETURNING id`,
    [orgB, patientB, chwB],
  );
  visitB = visitBResult.rows[0].id as string;

  app = buildApp({ logger: false });
}, 30_000);

afterAll(async () => {
  await app.close();
  await pool.end();
}, 30_000);

function basicFollowUp(): { patientId: string; summary: string } {
  return {
    patientId: patientA,
    summary: "Recheck blood pressure in two weeks.",
  };
}

describe("POST /api/v1/follow-ups", () => {
  it("lets an authenticated CHW create a follow-up (201, org-scoped)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/follow-ups",
      headers: authHeaders(signToken(chwA)),
      payload: basicFollowUp(),
    });

    expect(response.statusCode).toBe(201);
    const followUp = response.json().data.followUp;
    expect(followUp).toMatchObject({
      organizationId: orgA,
      patientId: patientA,
      summary: "Recheck blood pressure in two weeks.",
      visitId: null,
      assignedTo: null,
      dueDate: null,
      status: "OPEN",
      clientGeneratedId: null,
    });
    expect(followUp).not.toHaveProperty("passwordHash");
  });

  it("requires patientId, summary, and valid uuids (400)", async () => {
    const cases = [
      { summary: "No patient" },
      { patientId: patientA },
      { patientId: "not-a-uuid", summary: "Bad patient" },
      { patientId: patientA, summary: "   " },
    ];
    for (const payload of cases) {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/follow-ups",
        headers: authHeaders(signToken(chwA)),
        payload,
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns 404 when the patient belongs to another organization", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/follow-ups",
      headers: authHeaders(signToken(chwA)),
      payload: { patientId: patientB, summary: "n/a" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("rejects a SUPERVISOR from creating (403)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/follow-ups",
      headers: authHeaders(signToken(supA)),
      payload: basicFollowUp(),
    });
    expect(response.statusCode).toBe(403);
  });

  it("rejects an assignedTo user from another organization (404)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/follow-ups",
      headers: authHeaders(signToken(chwA)),
      payload: { ...basicFollowUp(), assignedTo: userB },
    });
    expect(response.statusCode).toBe(404);
  });

  it("attaches a follow-up to a visit in the same organization", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/follow-ups",
      headers: authHeaders(signToken(chwA)),
      payload: { ...basicFollowUp(), visitId: visitA, dueDate: "2026-10-01" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.followUp.visitId).toBe(visitA);
    expect(response.json().data.followUp.dueDate).toBe("2026-10-01");
  });

  it("rejects a visitId from another organization (404)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/follow-ups",
      headers: authHeaders(signToken(chwA)),
      payload: { ...basicFollowUp(), visitId: visitB },
    });
    expect(response.statusCode).toBe(404);
  });

  it("rejects a visitId that belongs to a different patient (400)", async () => {
    const otherPatient = await pool.query(
      `INSERT INTO patients (organization_id, first_name, last_name, date_of_birth, gender)
       VALUES ($1, 'Chiamaka', 'Eze', '2000-02-02', 'female')
       RETURNING id`,
      [orgA],
    );
    const otherVisit = await pool.query(
      `INSERT INTO visits (organization_id, patient_id, chw_id, visited_at)
       VALUES ($1, $2, $3, now())
       RETURNING id`,
      [orgA, otherPatient.rows[0].id as string, chwA],
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/follow-ups",
      headers: authHeaders(signToken(chwA)),
      payload: { patientId: patientA, summary: "Mixed", visitId: otherVisit.rows[0].id as string },
    });
    expect(response.statusCode).toBe(400);
  });

  it("is idempotent for a repeated client_generated_id", async () => {
    const cgi = randomUUID();
    const payload = { ...basicFollowUp(), clientGeneratedId: cgi };

    const first = await app.inject({
      method: "POST",
      url: "/api/v1/follow-ups",
      headers: authHeaders(signToken(chwA)),
      payload,
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/follow-ups",
      headers: authHeaders(signToken(chwA)),
      payload,
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(second.json().data.followUp.id).toBe(first.json().data.followUp.id);

    const count = await pool.query(
      "SELECT count(*)::int AS n FROM follow_ups WHERE client_generated_id = $1",
      [cgi],
    );
    expect(count.rows[0].n).toBe(1);
  });
});

describe("GET /api/v1/patients/:id/follow-ups", () => {
  it("lists a patient's follow-ups, org-scoped", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/follow-ups",
      headers: authHeaders(signToken(chwA)),
      payload: { ...basicFollowUp(), summary: "List me one." },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/follow-ups",
      headers: authHeaders(signToken(chwA)),
      payload: { ...basicFollowUp(), summary: "List me two." },
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/patients/${patientA}/follow-ups`,
      headers: authHeaders(signToken(chwA)),
    });

    expect(response.statusCode).toBe(200);
    const followUps = response.json().data.followUps;
    expect(followUps.length).toBeGreaterThanOrEqual(2);
    expect(followUps.every((f: { organizationId: string }) => f.organizationId === orgA)).toBe(true);
    expect(followUps.some((f: { summary: string }) => f.summary === "List me one.")).toBe(true);
    expect(followUps.some((f: { summary: string }) => f.summary === "List me two.")).toBe(true);
  });

  it("lets a SUPERVISOR read the listing", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/patients/${patientA}/follow-ups`,
      headers: authHeaders(signToken(supA)),
    });
    expect(response.statusCode).toBe(200);
  });

  it("returns 404 for another organization's patient", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/patients/${patientB}/follow-ups`,
      headers: authHeaders(signToken(chwA)),
    });
    expect(response.statusCode).toBe(404);
  });
});

describe("PATCH /api/v1/follow-ups/:id", () => {
  let followUpId: string;

  beforeAll(async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/follow-ups",
      headers: authHeaders(signToken(chwA)),
      payload: { ...basicFollowUp(), summary: "Patch target." },
    });
    followUpId = response.json().data.followUp.id;
  }, 30_000);

  it("updates the follow-up status and details", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/follow-ups/${followUpId}`,
      headers: authHeaders(signToken(chwA)),
      payload: { status: "COMPLETED", summary: "Patch updated summary." },
    });

    expect(response.statusCode).toBe(200);
    const followUp = response.json().data.followUp;
    expect(followUp.status).toBe("COMPLETED");
    expect(followUp.summary).toBe("Patch updated summary.");
  });

  it("lets a SUPERVISOR update within the organization", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/follow-ups/${followUpId}`,
      headers: authHeaders(signToken(supA)),
      payload: { status: "OPEN" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.followUp.status).toBe("OPEN");
  });

  it("allows clearing optional fields with null", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/follow-ups/${followUpId}`,
      headers: authHeaders(signToken(chwA)),
      payload: { assignedTo: null, dueDate: null },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.followUp.assignedTo).toBeNull();
    expect(response.json().data.followUp.dueDate).toBeNull();
  });

  it("rejects an invalid status (400)", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/follow-ups/${followUpId}`,
      headers: authHeaders(signToken(chwA)),
      payload: { status: "IN_PROGRESS" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 404 for a cross-organization update", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/follow-ups/${followUpId}`,
      headers: authHeaders(signToken(chwB)),
      payload: { status: "CANCELLED" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("rejects assigning to a user from another organization (404)", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/follow-ups/${followUpId}`,
      headers: authHeaders(signToken(supA)),
      payload: { assignedTo: userB },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 404 for an unknown follow-up id", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/follow-ups/${randomUUID()}`,
      headers: authHeaders(signToken(chwA)),
      payload: { status: "CANCELLED" },
    });
    expect(response.statusCode).toBe(404);
  });
});