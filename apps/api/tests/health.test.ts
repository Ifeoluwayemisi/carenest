import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";

let app: FastifyInstance;

beforeEach(() => {
  app = buildApp({ logger: false });
});

afterEach(() => app.close());

describe("GET /health", () => {
  it("responds with the documented health envelope", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: true,
      message: "CareNest API is running",
    });
  });
});

describe("unknown routes", () => {
  it("responds with the NOT_FOUND error envelope", async () => {
    const response = await app.inject({ method: "GET", url: "/does-not-exist" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "NOT_FOUND" },
    });
  });
});

describe("CORS", () => {
  it("allows the configured CLIENT_URL origin", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "http://localhost:3000" },
    });

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });
});