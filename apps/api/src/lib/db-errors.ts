/** Minimal shape of a node-postgres error we inspect. */
interface PgError {
  code?: string;
}

/** True when `error` is a PostgreSQL unique-violation (SQLSTATE 23505). */
export function isUniqueViolation(error: unknown): error is PgError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as PgError).code === "23505"
  );
}