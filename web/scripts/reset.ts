// Drops every table in the LOCAL database. `pnpm db:reset` then re-runs migrations and the seed.
import { assertLocalDatabase } from "./load-env";
import pg from "pg";

assertLocalDatabase();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;");
await client.end();
console.log("Local database wiped.");
