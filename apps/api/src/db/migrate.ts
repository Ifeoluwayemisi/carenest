import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Pool } from "pg";

// Resolves to apps/api/migrations whether running from src/ (tsx) or dist/ (node).
const MIGRATIONS_DIR = path.resolve(__dirname, "../../migrations");

/**
 * Applies pending SQL migrations in filename order.
 * Applied files are tracked in the `schema_migrations` table so each file runs
 * exactly once. Each migration runs inside a transaction.
 */
export async function runMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("No migration files found.");
      return;
    }

    for (const file of files) {
      const applied = await client.query(
        "SELECT 1 FROM schema_migrations WHERE filename = $1",
        [file],
      );

      if ((applied.rowCount ?? 0) > 0) {
        continue;
      }

      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`Applied migration: ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        console.error(`Migration failed: ${file}`);
        throw error;
      }
    }
  } finally {
    client.release();
  }
}