import { pool } from "./pool";
import { runMigrations } from "./migrate";

/** CLI entry point: npm run db:migrate */
async function main(): Promise<void> {
  try {
    await runMigrations(pool);
    console.log("Database migrations complete.");
  } catch (error) {
    console.error("Database migration failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();