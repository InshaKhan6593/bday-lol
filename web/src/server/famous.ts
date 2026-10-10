import { and, asc, eq, inArray, isNull, like, max } from "drizzle-orm";
import type { Executor } from "@/db";
import { famousHidden, famousPeople } from "@/db/schema";
import { toKey, type MonthDay } from "@/lib/birthday";
import type { FamousBirthdaysProvider } from "./famous-source";

/** How many famous people the "About" section lists (06-seo.md). */
const FAMOUS_LIMIT = 10;

export type FamousPerson = {
  /** Wikidata id ("Q12345"): links the person to their Wikidata entry in structured data. */
  sourceId: string;
  source: string;
  name: string;
  /** Short label, e.g. "TV judge". */
  knownFor: string;
  /** The age they turn on this date in the board's year. */
  age: number;
  birthDate: string;
};

/**
 * Famous people born on a month-day, best known first, skipping anyone the
 * admin hid (so the next name moves up). The table is filled by refreshFamousMonth
 * (cron: /api/cron/famous; locally: `pnpm famous:refresh`).
 */
export async function getFamousPeople(db: Executor, md: MonthDay, year: number): Promise<FamousPerson[]> {
  const rows = await db
    .select({
      sourceId: famousPeople.sourceId,
      source: famousPeople.source,
      name: famousPeople.name,
      knownFor: famousPeople.knownFor,
      birthDate: famousPeople.birthDate,
    })
    .from(famousPeople)
    .leftJoin(
      famousHidden,
      and(eq(famousHidden.source, famousPeople.source), eq(famousHidden.sourceId, famousPeople.sourceId)),
    )
    .where(and(eq(famousPeople.key, toKey(md)), isNull(famousHidden.sourceId)))
    .orderBy(asc(famousPeople.rank))
    .limit(FAMOUS_LIMIT);

  return rows.map((row) => ({ ...row, age: year - Number(row.birthDate.slice(0, 4)) }));
}

/** The best-known (not hidden) names for each date in a month, keyed "10-07", for the month page. */
export async function getFamousNamesForMonth(db: Executor, month: number, perDate = 2): Promise<Record<string, string[]>> {
  const rows = await db
    .select({ key: famousPeople.key, name: famousPeople.name })
    .from(famousPeople)
    .leftJoin(
      famousHidden,
      and(eq(famousHidden.source, famousPeople.source), eq(famousHidden.sourceId, famousPeople.sourceId)),
    )
    .where(and(like(famousPeople.key, `${String(month).padStart(2, "0")}-%`), isNull(famousHidden.sourceId)))
    .orderBy(asc(famousPeople.key), asc(famousPeople.rank));
  const out: Record<string, string[]> = {};
  for (const row of rows) {
    const names = (out[row.key] ??= []);
    if (names.length < perDate) names.push(row.name);
  }
  return out;
}

/** When each date's famous list was last refreshed, keyed "10-07" (sitemap lastmod). */
export async function getFamousRefreshedAt(db: Executor): Promise<Record<string, Date>> {
  const rows = await db
    .select({ key: famousPeople.key, at: max(famousPeople.refreshedAt) })
    .from(famousPeople)
    .groupBy(famousPeople.key);
  return Object.fromEntries(rows.flatMap((r) => (r.at ? [[r.key, r.at]] : [])));
}

/**
 * Replaces one month's famous people with a fresh fetch from the provider.
 * Hidden people stay hidden: famous_hidden is keyed on the source id, not the row.
 * Runs month by month (the cron refreshes months 1–12 on days 1–12), so each run is short.
 */
export async function refreshFamousMonth(
  db: Executor,
  provider: FamousBirthdaysProvider,
  month: number,
  instant: Date,
): Promise<{ dates: number; people: number }> {
  const byKey = await provider.fetchMonth(month, instant);
  const rows = [...byKey.entries()].flatMap(([key, people]) =>
    people.map((p) => ({ key, source: provider.source, refreshedAt: instant, ...p })),
  );
  // Only the dates the provider returned are replaced: a date it couldn't fetch keeps last month's list.
  const keys = [...byKey.keys()];
  if (!keys.length) return { dates: 0, people: 0 };
  await db.transaction(async (tx) => {
    await tx.delete(famousPeople).where(and(eq(famousPeople.source, provider.source), inArray(famousPeople.key, keys)));
    if (rows.length) await tx.insert(famousPeople).values(rows);
  });
  return { dates: byKey.size, people: rows.length };
}
