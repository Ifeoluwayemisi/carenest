import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { buildApp } from "../src/app";
import { pool } from "../src/db/pool";
import { runMigrations } from "../src/db/migrate";
import { setVisitDeps } from "../src/services/visits.service";
import type {
  CareNestAiResult,
  ProcessVisitInput,
  ProcessVisitResult,
} from "../src/services/ai";
import type { TranscriptionResult } from "../src/services/speech";

const PASSWORD = "Correct-Horse-Battery-Staple-42";
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
let chwA: string;
let supA: string;
let chwB: string;
let patientA: string;
let patientB: string;

function fakeAiResult(): CareNestAiResult {
  return {
    summary: { text: "Visit summary drafted by the AI.", sourceType: "AI_SUGGESTED" },
    reportedConcerns: [
      { text: "Headache since morning.", sourceType: "PATIENT_REPORTED" },
      { text: "Mild fever observed.", sourceType: "CHW_RECORDED" },
    ],
    missingInformation: [{ text: "Fever duration missing.", sourceType: "AI_SUGGESTED" }],
    suggestedFollowUps: [{ text: "Recheck temperature in 3 days.", sourceType: "AI_SUGGESTED" }],
    safety: { disclaimer: "AI draft only, not a diagnosis.", flags: [] },
    meta: { model: "test-model", generatedAt: new Date().toISOString() },
  };
}

let lastAiInput: ProcessVisitInput | undefined;

const fakeAiSuccess = async (): Promise<ProcessVisitResult> => ({
  success: true,
  data: fakeAiResult(),
});
const fakeAiFailure = async (): Promise<ProcessVisitResult> => ({
  success: false,
  error: { code: "PROVIDER_ERROR", message: "AI provider unreachable" },
});
const fakeAiRecording = async (input: ProcessVisitInput): Promise<ProcessVisitResult> => {
  lastAiInput = input;
  return fakeAiSuccess();
};
const fakeSttSuccess = async (): Promise<TranscriptionResult> => ({
  success: true,
  data: { text: "Patient complains of a cough since two days." },
});
const fakeSttFailure = async (): Promise<TranscriptionResult> => ({
  success: false,
  error: { code: "PROVIDER_NOT_CONFIGURED", message: "No STT key" },
});

beforeAll(async () => {
  await runMigrations(pool);

  const orgResult = await pool.query(
    `INSERT INTO organizations (name, slug)
     VALUES ('Visits Test Org A', 'carenest-visits-test-a')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
  );
  orgA = orgResult.rows[0].id as string;

  const orgBResult = await pool.query(
    `INSERT INTO organizations (name, slug)
     VALUES ('Visits Test Org B', 'carenest-visits-test-b')
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

  chwA = await upsertUser(orgA, "CHW", "Visits CHW A", "visits-a-chw@carenest.test");
  supA = await upsertUser(orgA, "SUPERVISOR", "Visits Sup A", "visits-a-sup@carenest.test");
  chwB = await upsertUser(orgB, "CHW", "Visits CHW B", "visits-b-chw@carenest.test");

  const patientResult = await pool.query(
    `INSERT INTO patients (organization_id, first_name, last_name, date_of_birth, gender)
     VALUES ($1, 'Sade', 'Bello', '1990-03-14', 'female')
     RETURNING id`,
    [orgA],
  );
  patientA = patientResult.rows[0].id as string;

  const patientBResult = await pool.query(
    `INSERT INTO patients (organization_id, first_name, last_name, date_of_birth)
     VALUES ($1, 'Kelechi', 'Obi', '2001-07-02')
     RETURNING id`,
    [orgB],
  );
  patientB = patientBResult.rows[0].id as string;

  app = buildApp({ logger: false });
}, 30_000);

afterAll(async () => {
  await app.close();
  await pool.end();
}, 30_000);

beforeEach(() => {
  setVisitDeps({ processVisit: fakeAiSuccess, transcribeAudio: fakeSttSuccess });
  lastAiInput = undefined;
});

function buildMultipart(
  fields: Record<string, string>,
  file?: { fieldname: string; filename: string; contentType: string; data: Buffer },
) {
  const boundary = `----carenestTest${randomUUID().replace(/-/g, "")}`;
  let head = "";
  for (const [name, value] of Object.entries(fields)) {
    head += `--${boundary}\r\n`;
    head += `Content-Disposition: form-data; name="${name}"\r\n\r\n`;
    head += `${value}\r\n`;
  }
  let data = Buffer.from(head, "utf8");
  if (file) {
    const fileHead =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\n` +
      `Content-Type: ${file.contentType}\r\n\r\n`;
    data = Buffer.concat([data, Buffer.from(fileHead, "utf8"), file.data]);
  }
  const tail = `\r\n--${boundary}--\r\n`;
  data = Buffer.concat([data, Buffer.from(tail, "utf8")]);
  return { headers: { "content-type": `multipart/form-data; boundary=${boundary}` }, payload: data };
}

function basicTextVisit(): {
  patientId: string;
  transcript: string;
  notes: string;
} {
  return {
    patientId: patientA,
    transcript: "Patient reported headache and mild fever since yesterday.",
    notes: "Gave ORS and paracetamol; advised fluids.",
  };
}

describe("POST /api/v1/visits — text visit → AI draft", () => {
  it("creates a DRAFT visit and attaches the structured AI draft", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/visits",
      headers: authHeaders(signToken(chwA)),
      payload: basicTextVisit(),
    });

    expect(response.statusCode).toBe(201);
    const visit = response.json().data.visit;
    expect(visit).toMatchObject({
      organizationId: orgA,
      patientId: patientA,
      chwId: chwA,
      status: "DRAFT",
      aiStatus: "VALIDATED",
      aiValidated: true,
      aiError: null,
    });
    expect(visit.transcript).toBe(basicTextVisit().transcript);
    expect(visit.aiGeneratedJson.summary.text).toContain("Visit summary");
    expect(visit).not.toHaveProperty("passwordHash");
  });

  it("sends the mapped patient context (age/gender) to processVisit", async () => {
    setVisitDeps({ processVisit: fakeAiRecording, transcribeAudio: fakeSttSuccess });

    await app.inject({
      method: "POST",
      url: "/api/v1/visits",
      headers: authHeaders(signToken(chwA)),
      payload: basicTextVisit(),
    });

    expect(lastAiInput?.transcript).toBe(basicTextVisit().transcript);
    expect(lastAiInput?.patientContext).toMatchObject({ gender: "female" });
    expect(typeof lastAiInput?.patientContext?.ageYears).toBe("number");
  });

  it("rejects a visit without a transcript (400)", async () => {
    const noTranscript = { patientId: patientA, notes: basicTextVisit().notes };
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/visits",
      headers: authHeaders(signToken(chwA)),
      payload: noTranscript,
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("does not let a CHW create a visit for another organization's patient (404)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/visits",
      headers: authHeaders(signToken(chwA)),
      payload: { patientId: patientB, transcript: "Hello" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("persists the transcript even when AI structuring fails, with ai_status FAILED", async () => {
    setVisitDeps({ processVisit: fakeAiFailure, transcribeAudio: fakeSttSuccess });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/visits",
      headers: authHeaders(signToken(chwA)),
      payload: basicTextVisit(),
    });

    expect(response.statusCode).toBe(201);
    const visit = response.json().data.visit;
    expect(visit.aiStatus).toBe("FAILED");
    expect(visit.aiValidated).toBe(false);
    expect(visit.aiError).toContain("PROVIDER_ERROR");
    expect(visit.transcript).toBe(basicTextVisit().transcript);
    expect(visit.aiGeneratedJson).toBeNull();
  });

  it("is idempotent for a repeated client_generated_id", async () => {
    const cgi = randomUUID();
    const payload = { ...basicTextVisit(), clientGeneratedId: cgi };

    const first = await app.inject({
      method: "POST",
      url: "/api/v1/visits",
      headers: authHeaders(signToken(chwA)),
      payload,
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/visits",
      headers: authHeaders(signToken(chwA)),
      payload,
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(second.json().data.visit.id).toBe(first.json().data.visit.id);

    const count = await pool.query("SELECT count(*)::int AS n FROM visits WHERE client_generated_id = $1", [cgi]);
    expect(count.rows[0].n).toBe(1);
  });
});

describe("POST /api/v1/visits — voice visit (multipart audio → STT)", () => {
  it("transcribes audio and creates the visit with the STT transcript", async () => {
    const body = buildMultipart(
      { patientId: patientA, notes: "Voice visit" },
      { fieldname: "audio", filename: "visit.mp3", contentType: "audio/mpeg", data: Buffer.from("fake audiobytes") },
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/visits",
      headers: { "content-type": body.headers["content-type"], ...authHeaders(signToken(chwA)) },
      payload: body.payload,
    });

    expect(response.statusCode).toBe(201);
    const visit = response.json().data.visit;
    expect(visit.status).toBe("DRAFT");
    expect(visit.aiStatus).toBe("VALIDATED");
    expect(visit.transcript).toBe("Patient complains of a cough since two days.");
  });

  it("returns a typed error and creates no visit when STT fails", async () => {
    setVisitDeps({ processVisit: fakeAiSuccess, transcribeAudio: fakeSttFailure });

    const body = buildMultipart(
      { patientId: patientA },
      { fieldname: "audio", filename: "visit.mp3", contentType: "audio/mpeg", data: Buffer.from("fake audiobytes") },
    );

    const before = await pool.query("SELECT count(*)::int AS n FROM visits WHERE patient_id = $1", [patientA]);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/visits",
      headers: { "content-type": body.headers["content-type"], ...authHeaders(signToken(chwA)) },
      payload: body.payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });

    const after = await pool.query("SELECT count(*)::int AS n FROM visits WHERE patient_id = $1", [patientA]);
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });
});

describe("Review, confirm, and timeline", () => {
  let draftId: string;

  beforeAll(async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/visits",
      headers: authHeaders(signToken(chwA)),
      payload: { ...basicTextVisit(), notes: "original note" },
    });
    draftId = response.json().data.visit.id;
  }, 30_000);

  it("lets a CHW move a draft to UNDER_REVIEW with review notes", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/visits/${draftId}`,
      headers: authHeaders(signToken(chwA)),
      payload: { notes: "corrected note", reviewNotes: "CHW added dosage info" },
    });

    expect(response.statusCode).toBe(200);
    const visit = response.json().data.visit;
    expect(visit.status).toBe("UNDER_REVIEW");
    expect(visit.notes).toBe("corrected note");
    expect(visit.reviewNotes).toBe("CHW added dosage info");
  });

  it("blocks a SUPERVISOR from reviewing", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/visits/${draftId}`,
      headers: authHeaders(signToken(supA)),
      payload: { notes: "sneaky" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("confirms the visit with the CHW-authored confirmed_json", async () => {
    const confirmedJson = {
      summary: { text: "Confirmed summary.", sourceType: "CHW_RECORDED" },
      reportedConcerns: [{ text: "Headache since morning.", sourceType: "PATIENT_REPORTED" }],
      missingInformation: [],
      suggestedFollowUps: [],
    };

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/visits/${draftId}/confirm`,
      headers: authHeaders(signToken(chwA)),
      payload: { confirmedJson },
    });

    expect(response.statusCode).toBe(200);
    const visit = response.json().data.visit;
    expect(visit.status).toBe("CONFIRMED");
    expect(visit.confirmedBy).toBe(chwA);
    expect(visit.confirmedAt).toBeTruthy();
    expect(visit.confirmedJson.summary.text).toBe("Confirmed summary.");
    expect(visit.reviewNotes).toBe("CHW added dosage info");
  });

  it("confirms a visit even when AI failed (manual fallback)", async () => {
    setVisitDeps({ processVisit: fakeAiFailure, transcribeAudio: fakeSttSuccess });

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/visits",
      headers: authHeaders(signToken(chwA)),
      payload: { patientId: patientA, transcript: "Fever and chills." },
    });
    const visit = created.json().data.visit;
    expect(visit.aiStatus).toBe("FAILED");

    const confirmed = await app.inject({
      method: "POST",
      url: `/api/v1/visits/${visit.id}/confirm`,
      headers: authHeaders(signToken(chwA)),
      payload: {
        confirmedJson: {
          summary: { text: "Fever visit.", sourceType: "CHW_RECORDED" },
          reportedConcerns: [{ text: "Fever, chills.", sourceType: "PATIENT_REPORTED" }],
          missingInformation: [],
          suggestedFollowUps: [],
        },
      },
    });

    expect(confirmed.statusCode).toBe(200);
    expect(confirmed.json().data.visit.status).toBe("CONFIRMED");
    expect(confirmed.json().data.visit.aiStatus).toBe("FAILED");
  });

  it("returns 404 for a cross-organization visit read", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/visits/${draftId}`,
      headers: authHeaders(signToken(chwB)),
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns a patient timeline ordered by visitedAt (newest first)", async () => {
    const older = await app.inject({
      method: "POST",
      url: "/api/v1/visits",
      headers: authHeaders(signToken(chwA)),
      payload: { patientId: patientA, visitedAt: "2030-01-01T09:00:00.000Z", transcript: "Oldest visit." },
    });
    const newer = await app.inject({
      method: "POST",
      url: "/api/v1/visits",
      headers: authHeaders(signToken(chwA)),
      payload: { patientId: patientA, visitedAt: "2030-09-01T09:00:00.000Z", transcript: "Newest visit." },
    });
    expect(older.statusCode).toBe(201);
    expect(newer.statusCode).toBe(201);

    const timeline = await app.inject({
      method: "GET",
      url: `/api/v1/patients/${patientA}/timeline`,
      headers: authHeaders(signToken(supA)),
    });

    expect(timeline.statusCode).toBe(200);
    const data = timeline.json().data;
    expect(data.patientId).toBe(patientA);
    expect(data.visits.length).toBeGreaterThanOrEqual(2);
    const newestFirst = data.visits.every(
      (v: { visitedAt: string }, i: number, arr: Array<{ visitedAt: string }>) =>
        i === 0 || arr[i - 1].visitedAt >= v.visitedAt,
    );
    expect(newestFirst).toBe(true);
    expect(data.visits[0].transcript).toBe("Newest visit.");
    expect(data.visits.some((v: { summary: string | null }) => v.summary?.includes("Visit summary"))).toBe(true);
    expect(data.followUps).toEqual([]);
  });

  it("returns 404 for another organization's patient timeline", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/patients/${patientB}/timeline`,
      headers: authHeaders(signToken(chwA)),
    });
    expect(response.statusCode).toBe(404);
  });
});