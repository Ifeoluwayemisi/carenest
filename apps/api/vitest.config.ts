import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // DB-backed suites hit a remote database (Neon pooler) whose queries can
    // occasionally stall for several seconds on cold connections — under a
    // fully parallel suite run, beforeAll hooks can exceed the default 10s.
    testTimeout: 20000,
    hookTimeout: 60000,
    // Many workers each open a pg pool of up to DATABASE_POOL_MAX connections;
    // together they can exhaust Neon's connection budget and stall cold
    // connects. Cap concurrent workers so the remote DB stays responsive.
    maxWorkers: 4,
  },
});