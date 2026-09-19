import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // DB-backed suites hit a remote database (Neon pooler) whose queries can
    // occasionally stall for several seconds on cold connections.
    testTimeout: 20000,
  },
});