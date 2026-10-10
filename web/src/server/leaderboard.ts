import { and, asc, desc, eq, gt, like, lte, max } from "drizzle-orm";
import type { BoardTypeSettings } from "@/config/board-types";
import type { Executor } from "@/db";
import { boards, entries, leaderLog } from "@/db/schema";
import { currentBoardYear, toKey, type MonthDay } from "@/lib/birthday";
import { getBoardType } from "./boards";

export type RankedEntry = {
  id: string;
  publicId: string;
  /** Personal link name ("sam-rivera"). Null only for rows made before personal links existed. */
  slug: string | null;
  rank: number;
  name: string;
  bio: string;
  photoUrl: string | null;
  theme: (typeof entries.$inferSelect)["theme"];
  giftLinks: (typeof entries.$inferSelect)["giftLinks"];
  /** A child added by a parent (07 D4). */
  isMinor: boolean;
  totalCents: number;
};

export type BoardView = {
  md: MonthDay;
  year: number;
  boardId: string | null;
  entries: RankedEntry[];
};

/** Settings of the birthday board type (per-board overrides come later). */
export async function getBirthdaySettings(db: Executor): Promise<{ typeId: number; settings: BoardTypeSettings }> {
  const type = await getBoardType(db, "birthday");
  return { typeId: type.id, settings: type.settings };
}

/**
 * The open board for a month-day, ranked (highest total first, ties to whoever
 * got there first). Never creates rows: a date nobody has claimed has no board yet.
 */
export async function getCurrentBoard(
  db: Executor,
  typeId: number,
  settings: BoardTypeSettings,
  md: MonthDay,
  instant: Date,
): Promise<BoardView> {
  const year = currentBoardYear(md, instant, settings.timezone);
  const [board] = await db
    .select({ id: boards.id })
    .from(boards)
    .where(and(eq(boards.boardTypeId, typeId), eq(boards.key, toKey(md)), eq(boards.period, String(year))))
    .limit(1);
  if (!board) return { md, year, boardId: null, entries: [] };
  return { md, year, boardId: board.id, entries: await getRankedEntries(db, board.id) };
}

/** Live entries on a board, ranked: highest total first, ties to whoever got there first. */
export async function getRankedEntries(db: Executor, boardId: string): Promise<RankedEntry[]> {
  const rows = await db
    .select({
      id: entries.id,
      publicId: entries.publicId,
      slug: entries.slug,
      name: entries.name,
      bio: entries.bio,
      photoUrl: entries.photoUrl,
      theme: entries.theme,
      giftLinks: entries.giftLinks,
      isMinor: entries.isMinor,
      totalCents: entries.totalCents,
    })
    .from(entries)
    .where(and(eq(entries.boardId, boardId), eq(entries.status, "live")))
    .orderBy(desc(entries.totalCents), asc(entries.totalReachedAt));
  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

/**
 * Top total of every board that is open right now, keyed by month-day ("10-07").
 * A board is open from the moment the previous year's board closed until its
 * own date ends, so this always reads each date's current board (never last
 * year's). Dates nobody has claimed are missing. Powers the date picker.
 */
export async function getCurrentTopTotals(
  db: Executor,
  typeId: number,
  instant: Date,
): Promise<Record<string, number>> {
  const rows = await db
    .select({ key: boards.key, top: max(entries.totalCents) })
    .from(boards)
    .innerJoin(entries, and(eq(entries.boardId, boards.id), eq(entries.status, "live")))
    .where(and(eq(boards.boardTypeId, typeId), lte(boards.opensAt, instant), gt(boards.closesAt, instant)))
    .groupBy(boards.key);
  return Object.fromEntries(rows.flatMap((r) => (r.top === null ? [] : [[r.key, r.top]])));
}

/** Every #1 change on a board, oldest first (for the "held the homepage" lines). */
export async function getLeaderLog(
  db: Executor,
  boardId: string,
): Promise<Array<{ entryId: string; startedAt: Date; endedAt: Date | null }>> {
  return db
    .select({ entryId: leaderLog.entryId, startedAt: leaderLog.startedAt, endedAt: leaderLog.endedAt })
    .from(leaderLog)
    .where(eq(leaderLog.boardId, boardId))
    .orderBy(asc(leaderLog.startedAt));
}

export type BoardLeader = {
  name: string;
  totalCents: number;
  theme: RankedEntry["theme"];
  /** People on the board, #1 included. */
  count: number;
};

/**
 * #1 of every open board, keyed by month-day ("10-07"), optionally for one
 * month only. Same order as the boards themselves: highest total, then whoever
 * got there first. Powers the month pages.
 */
export async function getCurrentLeaders(
  db: Executor,
  typeId: number,
  instant: Date,
  month?: number,
): Promise<Record<string, BoardLeader>> {
  const open = and(eq(boards.boardTypeId, typeId), lte(boards.opensAt, instant), gt(boards.closesAt, instant));
  const rows = await db
    .select({ key: boards.key, name: entries.name, totalCents: entries.totalCents, theme: entries.theme })
    .from(boards)
    .innerJoin(entries, and(eq(entries.boardId, boards.id), eq(entries.status, "live")))
    .where(month ? and(open, like(boards.key, `${String(month).padStart(2, "0")}-%`)) : open)
    .orderBy(asc(boards.key), desc(entries.totalCents), asc(entries.totalReachedAt));
  const out: Record<string, BoardLeader> = {};
  for (const row of rows) {
    const seen = out[row.key];
    if (seen) seen.count++;
    else out[row.key] = { name: row.name, totalCents: row.totalCents, theme: row.theme, count: 1 };
  }
  return out;
}

/** When each open board last changed (a claim, a boost or an edit), keyed "10-07". The sitemap's lastmod. */
export async function getBoardActivity(db: Executor, typeId: number, instant: Date): Promise<Record<string, Date>> {
  const rows = await db
    .select({ key: boards.key, at: max(entries.updatedAt) })
    .from(boards)
    .innerJoin(entries, and(eq(entries.boardId, boards.id), eq(entries.status, "live")))
    .where(and(eq(boards.boardTypeId, typeId), lte(boards.opensAt, instant), gt(boards.closesAt, instant)))
    .groupBy(boards.key);
  return Object.fromEntries(rows.flatMap((r) => (r.at ? [[r.key, r.at]] : [])));
}
