import type { ZodType } from "zod";
import { ValidationFailedError } from "./errors";

/**
 * Validates untrusted data against a Zod schema and throws a
 * ValidationFailedError (HTTP 400 VALIDATION_ERROR) when it does not match.
 */
export function validate<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw ValidationFailedError.fromZod(result.error);
  }
  return result.data;
}