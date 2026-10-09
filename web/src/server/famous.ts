import { and, asc, eq, isNull } from "drizzle-orm";
import type { Executor } from "@/db";
import { famousHidden, famousPeople } from "@/db/schema";
import { toKey, type MonthDay } from "@/lib/birthday";

/** How many famous people the "About" section lists (06-seo.md). */
const FAMOUS_LIMIT = 10;

export type FamousPerson = {
  name: string;
  /** Short label, e.g. "TV judge". */
  knownFor: string;
  /** The age they turn on this date in the board's year. */
  age: number;
};

/**
 * Famous people born on a month-day, best known first, skipping anyone the
 * admin hid (so the next name moves up). The table is filled by the monthly
 * refresh (SEO step); until then this returns an empty list.
 */
export async function getFamousPeople(db: Executor, md: MonthDay, year: number): Promise<FamousPerson[]> {
  const rows = await db
    .select({ name: famousPeople.name, knownFor: famousPeople.knownFor, birthDate: famousPeople.birthDate })
    .from(famousPeople)
    .leftJoin(
      famousHidden,
      and(eq(famousHidden.source, famousPeople.source), eq(famousHidden.sourceId, famousPeople.sourceId)),
    )
    .where(and(eq(famousPeople.key, toKey(md)), isNull(famousHidden.sourceId)))
    .orderBy(asc(famousPeople.rank))
    .limit(FAMOUS_LIMIT);

  return rows.map((row) => ({
    name: row.name,
    knownFor: row.knownFor,
    age: year - Number(row.birthDate.slice(0, 4)),
  }));
}
