import { defineConfig } from "vitest/config";
import base, { CONCURRENCY_TESTS } from "./vitest.config";

// Only the tests that fire many payments at once on real connections (see vitest.config.ts).
export default defineConfig({
  ...base,
  test: { ...base.test, include: [CONCURRENCY_TESTS], exclude: [] },
});
