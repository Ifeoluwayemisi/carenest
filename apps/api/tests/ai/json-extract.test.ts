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

  it("parses nested JSON structures", () => {
    const text = '{"a":{"b":[1,2,{"c":"three"}]},"d":null}';
    expect(extractJson(text)).toEqual({ a: { b: [1, 2, { c: "three" }] }, d: null });
  });

  it("skips a malformed first fenced block and finds a valid later one", () => {
    // A model occasionally prefaces its real answer with a broken/partial
    // example block. The first fence alone is not valid JSON; the second is.
    const text = [
      "Here's roughly the shape: ```json { not valid json ``` ",
      "Actual answer: ```json {\"a\":1} ```",
    ].join("\n");
    expect(extractJson(text)).toEqual({ a: 1 });
  });

  it("is not confused by brace-like characters in surrounding prose when a clean fence is present", () => {
    const text = 'Note: the patient said "{no problems}" today.\n```json\n{"a":1}\n```';
    expect(extractJson(text)).toEqual({ a: 1 });
  });

  it("returns null for a non-JSON provider response (e.g. a refusal in prose)", () => {
    const text = "I'm sorry, I can't provide a diagnosis for this transcript.";
    expect(extractJson(text)).toBeNull();
  });

  it("returns null when whitespace-only", () => {
    expect(extractJson("   \n\t  ")).toBeNull();
  });
});
