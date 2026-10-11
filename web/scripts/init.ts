// Creates the rows a new database needs before the app can run (the birthday board type).
// Safe to run again and on a live database: it never changes or deletes existing rows.
// `pnpm db:seed` does this too, but it also wipes everything and adds the demo people.
import "./load-env";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { db } from "@/db";
import { boardTypes } from "@/db/schema";

const created = await db.insert(boardTypes).values(BIRTHDAY_BOARD_TYPE).onConflictDoNothing({ target: boardTypes.slug }).returning();
console.log(created.length ? `Created board type "${BIRTHDAY_BOARD_TYPE.slug}".` : `Board type "${BIRTHDAY_BOARD_TYPE.slug}" already exists.`);
process.exit(0);
