import { describe, expect, it, vi } from "vitest";
import { SttProviderNotConfiguredError, type SttProvider } from "../../src/services/speech/provider";
import { createSttService } from "../../src/services/speech/service";

function fakeProvider(impl: SttProvider["transcribe"]): SttProvider {
  return { transcribe: impl };
}

const validAudioInput = {
  audio: Buffer.from("fake-audio-bytes"),
  filename: "recording.webm",
  mimeType: "audio/webm",
};

describe("createSttService(provider).transcribeAudio", () => {
  it("returns a successful transcription from a well-behaved provider", async () => {
    const { transcribeAudio } = createSttService(
      fakeProvider(async () => "Patient reports a cough for three days."),
    );

    const result = await transcribeAudio(validAudioInput);

    expect(result).toEqual({
      success: true,
      data: { text: "Patient reports a cough for three days." },
    });
  });

  it("rejects invalid audio (unsupported format) without calling the provider", async () => {
    const transcribe = vi.fn();
    const { transcribeAudio } = createSttService(fakeProvider(transcribe));

    const result = await transcribeAudio({
      audio: Buffer.from("data"),
      filename: "notes.pdf",
      mimeType: "application/pdf",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("UNSUPPORTED_FORMAT");
    expect(transcribe).not.toHaveBeenCalled();
  });

  it("rejects empty audio without calling the provider", async () => {
    const transcribe = vi.fn();
    const { transcribeAudio } = createSttService(fakeProvider(transcribe));

    const result = await transcribeAudio({ ...validAudioInput, audio: Buffer.alloc(0) });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("MISSING_AUDIO");
    expect(transcribe).not.toHaveBeenCalled();
  });

  it("normalizes the filename sent to the provider instead of forwarding the original", async () => {
    const transcribe = vi.fn().mockResolvedValue("Some transcript.");
    const { transcribeAudio } = createSttService(fakeProvider(transcribe));

    await transcribeAudio({
      audio: Buffer.from("data"),
      filename: "jane-doe-home-visit.webm",
      mimeType: "audio/webm",
    });

    expect(transcribe).toHaveBeenCalledTimes(1);
    const call = transcribe.mock.calls[0][0] as { filename: string };
    expect(call.filename).toBe("audio.webm");
    expect(call.filename).not.toContain("jane-doe");
  });

  it("returns PROVIDER_NOT_CONFIGURED when the provider signals missing configuration", async () => {
    const { transcribeAudio } = createSttService(
      fakeProvider(async () => {
        throw new SttProviderNotConfiguredError("GROQ_API_KEY is not configured.");
      }),
    );

    const result = await transcribeAudio(validAudioInput);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("PROVIDER_NOT_CONFIGURED");
  });

  it("returns PROVIDER_TIMEOUT when the provider aborts", async () => {
    const { transcribeAudio } = createSttService(
      fakeProvider(async () => {
        const err = new Error("The operation was aborted");
        err.name = "AbortError";
        throw err;
      }),
    );

    const result = await transcribeAudio(validAudioInput);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("PROVIDER_TIMEOUT");
  });

  it("returns PROVIDER_ERROR when the provider is unreachable", async () => {
    const { transcribeAudio } = createSttService(
      fakeProvider(async () => {
        throw new Error("fetch failed: ECONNREFUSED");
      }),
    );

    const result = await transcribeAudio(validAudioInput);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("PROVIDER_ERROR");
  });

  it("returns PROVIDER_ERROR when the provider responds with an API error", async () => {
    const { transcribeAudio } = createSttService(
      fakeProvider(async () => {
        throw new Error("Groq speech-to-text API responded with 500: internal error");
      }),
    );

    const result = await transcribeAudio(validAudioInput);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("PROVIDER_ERROR");
  });

  it("returns EMPTY_TRANSCRIPTION when the provider returns no speech", async () => {
    const { transcribeAudio } = createSttService(fakeProvider(async () => "   "));

    const result = await transcribeAudio(validAudioInput);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("EMPTY_TRANSCRIPTION");
  });

  it("passes the language hint through to the provider when given", async () => {
    const transcribe = vi.fn().mockResolvedValue("Bonjour.");
    const { transcribeAudio } = createSttService(fakeProvider(transcribe));

    await transcribeAudio({ ...validAudioInput, languageHint: "fr" });

    const call = transcribe.mock.calls[0][0] as { language?: string };
    expect(call.language).toBe("fr");
  });
});
