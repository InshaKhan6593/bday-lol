// Imported first by scripts so .env.local is loaded before anything reads process.env.
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

/** Scripts that wipe data must only ever touch a local database. */
export function assertLocalDatabase(): void {
  const url = process.env.DATABASE_URL ?? "";
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(`Refusing to modify a non-local database (host: "${host || "unknown"}").`);
  }
}
