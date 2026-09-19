import { describe, expect, it } from "vitest";
import { resolveAudioExtension, validateAudioInput } from "../../src/services/speech/validation";
import type { TranscribeAudioInput } from "../../src/services/speech/types";

const ONE_MB = 1024 * 1024;

function input(overrides: Partial<TranscribeAudioInput> = {}): TranscribeAudioInput {
  return {
    audio: Buffer.from("fake-audio-bytes"),
    filename: "recording.webm",
    mimeType: "audio/webm",
    ...overrides,
  };
}

describe("resolveAudioExtension", () => {
  it("resolves from a recognized filename extension", () => {
    expect(resolveAudioExtension("visit-note.wav", "application/octet-stream")).toBe("wav");
  });

  it("falls back to the MIME type when the filename extension is unrecognized or missing", () => {
    expect(resolveAudioExtension("blob", "audio/webm")).toBe("webm");
    expect(resolveAudioExtension("recording.dat", "audio/mp4")).toBe("mp4");
  });

  it("handles a MIME type with codec parameters", () => {
    expect(resolveAudioExtension("recording", 'audio/webm;codecs="opus"')).toBe("webm");
  });

  it("returns null when neither filename nor MIME type is recognized", () => {
    expect(resolveAudioExtension("document.pdf", "application/pdf")).toBeNull();
  });
});

describe("validateAudioInput", () => {
  it("accepts a well-formed webm upload", () => {
    const result = validateAudioInput(input(), 25 * ONE_MB);
    expect(result).toEqual({ ok: true, extension: "webm" });
  });

  it("rejects empty audio", () => {
    const result = validateAudioInput(input({ audio: Buffer.alloc(0) }), 25 * ONE_MB);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("MISSING_AUDIO");
  });

  it("rejects audio over the configured size limit", () => {
    const result = validateAudioInput(input({ audio: Buffer.alloc(2 * ONE_MB) }), 1 * ONE_MB);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FILE_TOO_LARGE");
  });

  it("rejects an unsupported format", () => {
    const result = validateAudioInput(
      input({ filename: "notes.pdf", mimeType: "application/pdf" }),
      25 * ONE_MB,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNSUPPORTED_FORMAT");
  });

  it("accepts common mobile/browser MediaRecorder formats", () => {
    expect(validateAudioInput(input({ filename: "a", mimeType: "audio/mp4" }), 25 * ONE_MB).ok).toBe(
      true,
    );
    expect(
      validateAudioInput(input({ filename: "a", mimeType: "audio/ogg" }), 25 * ONE_MB).ok,
    ).toBe(true);
  });
});
