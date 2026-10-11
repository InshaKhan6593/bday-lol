import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
}

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

/**
 * Connections one server process may hold. Every request runs its queries one after another, so a
 * process rarely needs more than a few. On Vercel many copies run at once and share the database's
 * limit: set DATABASE_POOL_MAX low there (3) and connect through Supabase's transaction pooler.
 */
const poolMax = Number(process.env.DATABASE_POOL_MAX) || 10;

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: poolMax,
    // Under a spike, wait this long for a free connection and then fail the request: an error page is
    // better than every visitor hanging until the platform's timeout.
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
/** The db client or an open transaction: queries take this so tests can roll back. */
export type Executor = Pick<Db, "select" | "insert" | "update" | "delete" | "transaction">;
export { schema };
