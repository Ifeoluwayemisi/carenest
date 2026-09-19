import { describe, expect, it } from "vitest";
import { extractJson } from "../../src/services/ai/json-extract";

describe("extractJson", () => {
  it("parses a clean JSON object", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("extracts JSON from a markdown code fence", () => {
    const text = 'Here is the result:\n```json\n{"a":1,"b":"two"}\n```\nLet me know if you need more.';
    expect(extractJson(text)).toEqual({ a: 1, b: "two" });
  });

  it("extracts JSON from an unlabeled code fence", () => {
    const text = '```\n{"a":1}\n```';
    expect(extractJson(text)).toEqual({ a: 1 });
  });

  it("extracts a JSON object surrounded by stray preamble/trailing text", () => {
    const text = 'Sure, here you go: {"a":1} — hope that helps!';
    expect(extractJson(text)).toEqual({ a: 1 });
  });

  it("returns null for text with no JSON object", () => {
    expect(extractJson("I cannot help with that request.")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(extractJson("")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(extractJson('{"a": 1,')).toBeNull();
  });
});
