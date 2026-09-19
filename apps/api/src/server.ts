import { buildApp } from "./app";
import { env } from "./config/env";
import { pool } from "./db/pool";

const app = buildApp();

async function main(): Promise<void> {
  try {
    await pool.query("SELECT 1");
    app.log.info("Database connection established");
  } catch (error) {
    // The foundation must boot even without a reachable database (the /health
    // probe is DB-independent). Feature code will surface DB errors properly.
    app.log.warn({ err: error }, "Database unreachable at startup — continuing anyway");
  }

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`API listening on http://localhost:${env.PORT}`);
  } catch (error) {
    app.log.error({ err: error }, "Failed to start API");
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  app.log.info(`Received ${signal}, shutting down`);
  await app.close();
  await pool.end().catch(() => undefined);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

void main();