// Creates the rows a new database needs before the app can run (the birthday board type).
// Safe to run again and on a live database: it never changes or deletes existing rows.
// `pnpm db:seed` does this too, but it also wipes everything and adds the demo people.
import "./load-env";
import { sql } from "drizzle-orm";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { db } from "@/db";
import { boardTypes } from "@/db/schema";

const created = await db.insert(boardTypes).values(BIRTHDAY_BOARD_TYPE).onConflictDoNothing({ target: boardTypes.slug }).returning();
console.log(created.length ? `Created board type "${BIRTHDAY_BOARD_TYPE.slug}".` : `Board type "${BIRTHDAY_BOARD_TYPE.slug}" already exists.`);

// Live boards (lib/live.ts): on Supabase, let visitors listen to the "board:…" push channels. There is no
// policy for sending, so only the server's service-role key can. A plain Postgres (local) has no Realtime.
const [realtime] = (await db.execute(sql`select to_regclass('realtime.messages') is not null as present`)).rows;
if (realtime?.present) {
  await db.execute(sql`drop policy if exists "visitors hear board changes" on realtime.messages`);
  await db.execute(sql`
    create policy "visitors hear board changes" on realtime.messages
    for select to anon, authenticated
    using (realtime.messages.extension = 'broadcast' and (select realtime.topic()) like 'board:%')`);
  console.log("Realtime: visitors can listen to board changes.");
} else {
  console.log("Realtime: not on this database (live boards check on a timer instead).");
}
process.exit(0);
