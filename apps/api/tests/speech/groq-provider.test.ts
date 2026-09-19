import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sttConfig } from "../../src/services/speech/config";
import { SttProviderNotConfiguredError } from "../../src/services/speech/provider";
import { GroqSttProvider } from "../../src/services/speech/providers/groq-provider";

/**
 * Tests the real Groq STT provider adapter (never exercised by
 * service.test.ts, which tests the generic orchestrator via a hand-written
 * fake provider). `global.fetch` is stubbed — deterministic, zero network
 * I/O. sttConfig.apiKey is set directly rather than relying on ambient .env
 * content, for the same reason as the AI module's equivalent tests.
 */
describe("GroqSttProvider", () => {
  const originalApiKey = sttConfig.apiKey;
  const request = {
    audio: Buffer.from("fake-audio-bytes"),
    filename: "audio.webm",
    mimeType: "audio/webm",
  };

  beforeEach(() => {
    sttConfig.apiKey = "test-groq-stt-api-key-do-not-log-me";
  });

  afterEach(() => {
    sttConfig.apiKey = originalApiKey;
    vi.unstubAllGlobals();
  });

  it("throws SttProviderNotConfiguredError without calling fetch when no API key is set", async () => {
    sttConfig.apiKey = undefined;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const provider = new GroqSttProvider();
    await expect(provider.transcribe(request)).rejects.toBeInstanceOf(SttProviderNotConfiguredError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends the API key as a Bearer token and uploads audio as multipart form data", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ text: "hello" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const provider = new GroqSttProvider();
    await provider.transcribe(request);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${sttConfig.apiKey}`);
    expect(init.body).toBeInstanceOf(FormData);
    // No manual Content-Type header — fetch must set the multipart boundary itself.
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("returns the transcription text on a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: "Patient reports a cough." }), { status: 200 })),
    );

    const provider = new GroqSttProvider();
    const result = await provider.transcribe(request);

    expect(result).toBe("Patient reports a cough.");
  });

  it("throws without leaking the API key when the response is a non-2xx error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("unauthorized: bad key", { status: 401 })),
    );

    const provider = new GroqSttProvider();
    try {
      await provider.transcribe(request);
      expect.unreachable("expected transcribe to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).not.toContain(sttConfig.apiKey);
    }
  });

  it("throws a clear error for a malformed provider response (missing text field)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ unexpected: "shape" }), { status: 200 })),
    );

    const provider = new GroqSttProvider();
    await expect(provider.transcribe(request)).rejects.toThrow(/did not include transcription text/);
  });

  it("throws a clear error when the response body is not valid JSON at all", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json", { status: 200 })));

    const provider = new GroqSttProvider();
    await expect(provider.transcribe(request)).rejects.toThrow();
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

    const originalTimeout = sttConfig.requestTimeoutMs;
    sttConfig.requestTimeoutMs = 10;

    const provider = new GroqSttProvider();
    await expect(provider.transcribe(request)).rejects.toMatchObject({ name: "AbortError" });

    sttConfig.requestTimeoutMs = originalTimeout;
  });

  it("includes the language hint in the request when provided, and omits it when not", async () => {
    let capturedForm: FormData | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        capturedForm = init.body as FormData;
        return Promise.resolve(new Response(JSON.stringify({ text: "ok" }), { status: 200 }));
      }),
    );

    const provider = new GroqSttProvider();
    await provider.transcribe({ ...request, language: "fr" });
    expect(capturedForm?.get("language")).toBe("fr");

    await provider.transcribe(request);
    expect(capturedForm?.get("language")).toBeNull();
  });
});
