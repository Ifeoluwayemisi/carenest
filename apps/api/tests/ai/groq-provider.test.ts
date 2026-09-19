import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiConfig } from "../../src/services/ai/config";
import { AiProviderNotConfiguredError } from "../../src/services/ai/provider";
import { GroqProvider } from "../../src/services/ai/providers/groq-provider";

/**
 * Tests the real Groq provider adapter (never exercised by service.test.ts,
 * which tests the generic orchestrator via a hand-written fake provider).
 * `global.fetch` is stubbed — deterministic, zero network I/O — so these
 * cover the actual HTTP request construction and error handling that ships
 * to production.
 *
 * aiConfig.apiKey is set directly rather than relying on ambient .env
 * content (which may or may not have a real/placeholder GROQ_API_KEY) —
 * see the earlier lesson about ambient-env-dependent tests being flaky.
 */
describe("GroqProvider", () => {
  const originalApiKey = aiConfig.apiKey;

  beforeEach(() => {
    aiConfig.apiKey = "test-groq-api-key-do-not-log-me";
  });

  afterEach(() => {
    aiConfig.apiKey = originalApiKey;
    vi.unstubAllGlobals();
  });

  it("throws AiProviderNotConfiguredError without calling fetch when no API key is set", async () => {
    aiConfig.apiKey = undefined;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const provider = new GroqProvider();
    await expect(
      provider.generate({ systemPrompt: "sys", userPrompt: "user" }),
    ).rejects.toBeInstanceOf(AiProviderNotConfiguredError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends the API key as a Bearer token and never in the request body", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: '{"a":1}' } }] }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const provider = new GroqProvider();
    await provider.generate({ systemPrompt: "sys", userPrompt: "user" });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${aiConfig.apiKey}`);
    expect(String(init.body)).not.toContain(aiConfig.apiKey);
  });

  it("returns the message content on a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: '{"summary":"ok"}' } }] }), {
          status: 200,
        }),
      ),
    );

    const provider = new GroqProvider();
    const result = await provider.generate({ systemPrompt: "sys", userPrompt: "user" });

    expect(result).toBe('{"summary":"ok"}');
  });

  it("throws without leaking the API key when the response is a non-2xx error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("unauthorized: bad key", { status: 401 })),
    );

    const provider = new GroqProvider();
    await expect(provider.generate({ systemPrompt: "sys", userPrompt: "user" })).rejects.toThrow();

    try {
      await provider.generate({ systemPrompt: "sys", userPrompt: "user" });
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).not.toContain(aiConfig.apiKey);
    }
  });

  it("truncates an oversized error response body instead of surfacing it unbounded", async () => {
    const hugeBody = "x".repeat(10_000);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(hugeBody, { status: 500 })));

    const provider = new GroqProvider();
    await expect(provider.generate({ systemPrompt: "sys", userPrompt: "user" })).rejects.toThrow();

    try {
      await provider.generate({ systemPrompt: "sys", userPrompt: "user" });
    } catch (err) {
      expect((err as Error).message.length).toBeLessThan(500);
    }
  });

  it("throws a clear error when the response has no message content (malformed provider response)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [] }), { status: 200 })),
    );

    const provider = new GroqProvider();
    await expect(
      provider.generate({ systemPrompt: "sys", userPrompt: "user" }),
    ).rejects.toThrow(/did not include message content/);
  });

  it("aborts and throws an AbortError-named error when the request exceeds the configured timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      }),
    );

    const originalTimeout = aiConfig.requestTimeoutMs;
    aiConfig.requestTimeoutMs = 10;

    const provider = new GroqProvider();
    await expect(
      provider.generate({ systemPrompt: "sys", userPrompt: "user" }),
    ).rejects.toMatchObject({ name: "AbortError" });

    aiConfig.requestTimeoutMs = originalTimeout;
  });
});
