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
let orgEmpty: string;
let adminA: string;
let supA: string;
let chwA: string;
let chwExtra: string;
let chwB: string;
let emptyAdmin: string;
let orgAPatients: string[];
let orgBPatient: string;

beforeAll(async () => {
  await runMigrations(pool);

  async function insertOrg(slug: string): Promise<string> {
    const result = await pool.query(
      `INSERT INTO organizations (name, slug)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ["Dashboard test org", slug],
    );
    return result.rows[0].id as string;
  }

  orgA = await insertOrg(`carenest-dashboard-a-${RUN_TAG}`);
  orgB = await insertOrg(`carenest-dashboard-b-${RUN_TAG}`);
  orgEmpty = await insertOrg(`carenest-dashboard-empty-${RUN_TAG}`);

  const passwordHash = bcrypt.hashSync(PASSWORD, 10);

  async function insertUser(orgId: string, role: string, name: string, email: string): Promise<string> {
    const result = await pool.query(
      `INSERT INTO users (organization_id, role, name, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [orgId, role, name, email, passwordHash],
    );
    return result.rows[0].id as string;
  }

  adminA = await insertUser(orgA, "ADMIN", "Dash Admin", `dash-a-admin@carenest-${RUN_TAG}.test`);
  supA = await insertUser(orgA, "SUPERVISOR", "Dash Sup", `dash-a-sup@carenest-${RUN_TAG}.test`);
  chwA = await insertUser(orgA, "CHW", "Dash CHW A", `dash-a-chw1@carenest-${RUN_TAG}.test`);
  chwExtra = await insertUser(orgA, "CHW", "Dash CHW B", `dash-a-chw2@carenest-${RUN_TAG}.test`);
  chwB = await insertUser(orgB, "CHW", "Dash CHW B-org", `dash-b-chw@carenest-${RUN_TAG}.test`);
  emptyAdmin = await insertUser(orgEmpty, "ADMIN", "Empty Admin", `dash-empty-admin@carenest-${RUN_TAG}.test`);

  orgAPatients = [];
  for (const name of ["Patient One", "Patient Two", "Patient Three"]) {
    const [first, last] = name.split(" ");
    const result = await pool.query(
      `INSERT INTO patients (organization_id, first_name, last_name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [orgA, first, last],
    );
    orgAPatients.push(result.rows[0].id as string);
  }

  const orgBPatientResult = await pool.query(
    `INSERT INTO patients (organization_id, first_name, last_name)
     VALUES ($1, 'Other', 'OrgBPatient')
     RETURNING id`,
    [orgB],
  );
  orgBPatient = orgBPatientResult.rows[0].id as string;

  // Org A: two visits today, one older than the current week.
  for (const patientId of [orgAPatients[0], orgAPatients[1]]) {
    await pool.query(
      `INSERT INTO visits (organization_id, patient_id, chw_id, visited_at)
       VALUES ($1, $2, $3, now() - interval '1 hour')
       RETURNING id`,
      [orgA, patientId, chwA],
    );
  }
  await pool.query(
    `INSERT INTO visits (organization_id, patient_id, chw_id, visited_at)
     VALUES ($1, $2, $3, now() - interval '12 days')
     RETURNING id`,
    [orgA, orgAPatients[2], chwExtra],
  );

  // Org A follow-ups: two OPEN, one COMPLETED, one CANCELLED (not counted).
  await pool.query(
    `INSERT INTO follow_ups (organization_id, patient_id, summary, status)
     VALUES ($1, $2, 'Pending one', 'OPEN'), ($1, $2, 'Pending two', 'OPEN'),
            ($1, $2, 'Done', 'COMPLETED'), ($1, $2, 'Dropped', 'CANCELLED')`,
    [orgA, orgAPatients[0]],
  );

  // Org B noise that must never leak into org A's summary.
  await pool.query(
    `INSERT INTO visits (organization_id, patient_id, chw_id, visited_at)
     VALUES ($1, $2, $3, now())
     RETURNING id`,
    [orgB, orgBPatient, chwB],
  );
  await pool.query(
    `INSERT INTO follow_ups (organization_id, patient_id, summary, status)
     VALUES ($1, $2, 'Org B follow-up', 'OPEN')`,
    [orgB, orgBPatient],
  );

  app = buildApp({ logger: false });
}, 30_000);

afterAll(async () => {
  await app.close();
  await pool.end();
}, 30_000);

/** Expected today/this-week counts using the endpoint's own window semantics. */
async function expectedVisitWindows(organizationId: string): Promise<{ today: number; week: number }> {
  const today = await pool.query(
    `SELECT count(*)::int AS n FROM visits
      WHERE organization_id = $1
        AND visited_at >= date_trunc('day', now())
        AND visited_at < date_trunc('day', now()) + interval '1 day'`,
    [organizationId],
  );
  const week = await pool.query(
    `SELECT count(*)::int AS n FROM visits
      WHERE organization_id = $1
        AND visited_at >= date_trunc('week', now())`,
    [organizationId],
  );
  return { today: today.rows[0].n as number, week: week.rows[0].n as number };
}

describe("GET /api/v1/dashboard/summary", () => {
  it("lets an ADMIN access the dashboard summary (200)", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/summary",
      headers: authHeaders(signToken(adminA)),
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.summary).toBeDefined();
  });

  it("lets a SUPERVISOR access the dashboard summary (200)", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/summary",
      headers: authHeaders(signToken(supA)),
    });
    expect(response.statusCode).toBe(200);
  });

  it("blocks a CHW from the dashboard (403)", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/summary",
      headers: authHeaders(signToken(chwA)),
    });
    expect(response.statusCode).toBe(403);
  });

  it("returns organization-scoped counts", async () => {
    const expected = await expectedVisitWindows(orgA);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/summary",
      headers: authHeaders(signToken(supA)),
    });

    expect(response.statusCode).toBe(200);
    const summary = response.json().data.summary;
    expect(summary.totalPatients).toBe(3);
    expect(summary.totalCHWs).toBe(2);
    expect(summary.visitsToday).toBe(expected.today);
    expect(summary.visitsThisWeek).toBe(expected.week);
    expect(expected.today).toBe(2);
    expect(expected.week).toBe(2);
    expect(summary.pendingFollowUps).toBe(2);
    expect(summary.completedFollowUps).toBe(1);
  });

  it("returns recent visits scoped to the organization, newest first", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/summary",
      headers: authHeaders(signToken(adminA)),
    });

    expect(response.statusCode).toBe(200);
    const recentVisits = response.json().data.summary.recentVisits;
    expect(recentVisits.length).toBe(3);

    const ids = new Set(recentVisits.map((v: { patientId: string }) => v.patientId) as string[]);
    expect(ids.has(orgBPatient)).toBe(false);

    const newestFirst = recentVisits.every(
      (v: { visitedAt: string }, i: number, arr: Array<{ visitedAt: string }>) =>
        i === 0 || arr[i - 1].visitedAt >= v.visitedAt,
    );
    expect(newestFirst).toBe(true);

    for (const visit of recentVisits as Array<Record<string, unknown>>) {
      expect(typeof visit.patientName).toBe("string");
      expect(typeof visit.chwName).toBe("string");
      expect(["DRAFT", "UNDER_REVIEW", "CONFIRMED"]).toContain(visit.status);
    }
  });

  it("returns zeros and an empty recent list for an empty organization", async () => {
    const emptyResponse = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/summary",
      headers: authHeaders(signToken(emptyAdmin)),
    });
    expect(emptyResponse.statusCode).toBe(200);
    expect(emptyResponse.json().data.summary).toEqual({
      totalPatients: 0,
      totalCHWs: 0,
      visitsToday: 0,
      visitsThisWeek: 0,
      pendingFollowUps: 0,
      completedFollowUps: 0,
      recentVisits: [],
    });
  });
});