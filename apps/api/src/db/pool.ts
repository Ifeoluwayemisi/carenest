import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { env } from "../config/env";

// Reuse a single Pool across the process and avoid leaking connections during
// development hot-reloads.
const globalForPool = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForPool.pool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: env.DATABASE_POOL_MAX,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPool.pool = pool;
}

/**
 * Shortcut for `pool.query` with a well-known signature. All application
 * queries must go through parameterized statements (never string-concatenated
 * values) to prevent SQL injection.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: readonly unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as unknown[]);
}

/**
 * Runs `work` inside a single transaction on a dedicated `PoolClient`.
 * Commits on success; rolls back and rethrows on failure. The client is always
 * released back to the pool.
 */
export async function withTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}