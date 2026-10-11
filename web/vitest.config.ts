import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Database tests (*.db.test.ts) use the local Docker Postgres from .env.local.
const env = config({ path: ".env.local", quiet: true }).parsed ?? {};

// The concurrency tests (vitest.concurrency.config.ts) commit on the real pool. The other database tests
// each TRUNCATE inside a rolled-back transaction, which locks every table, so the two kinds deadlock if
// they run together: `pnpm test` runs them one after the other.
export const CONCURRENCY_TESTS = "src/**/*.concurrency.test.ts";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: [CONCURRENCY_TESTS],
    environment: "node",
    env: { ...env, DEV_NOW: "" },
  },
});
