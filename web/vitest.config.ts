import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Database tests (*.db.test.ts) use the local Docker Postgres from .env.local.
const env = config({ path: ".env.local", quiet: true }).parsed ?? {};

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    env: { ...env, DEV_NOW: "" },
  },
});
