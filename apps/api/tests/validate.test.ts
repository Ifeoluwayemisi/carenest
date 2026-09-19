import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validate } from "../src/lib/validate";
import { ValidationFailedError } from "../src/lib/errors";

const schema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0).optional(),
});

describe("validate", () => {
  it("returns parsed data when the input matches the schema", () => {
    expect(validate(schema, { name: "Ada" })).toEqual({ name: "Ada" });
  });

  it("throws ValidationFailedError when the input does not match", () => {
    expect(() => validate(schema, { name: "" })).toThrow(ValidationFailedError);
  });

  it("rejects unknown surplus fields when the schema is strict", () => {
    const strict = schema.strict();
    expect(() => validate(strict, { name: "Ada", extra: true })).toThrow(
      ValidationFailedError,
    );
  });
});