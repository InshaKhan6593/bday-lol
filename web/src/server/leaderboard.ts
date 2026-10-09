import { and, asc, desc, eq } from "drizzle-orm";
import type { BoardTypeSettings } from "@/config/board-types";
import type { Executor } from "@/db";
import { boards, entries } from "@/db/schema";
import { currentBoardYear, toKey, type MonthDay } from "@/lib/birthday";
import { getBoardType } from "./boards";

export type RankedEntry = {
  id: string;
  publicId: string;
  rank: number;
  name: string;
  bio: string;
  photoUrl: string | null;
  theme: (typeof entries.$inferSelect)["theme"];
  giftLinks: (typeof entries.$inferSelect)["giftLinks"];
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

  const rows = await db
    .select({
      id: entries.id,
      publicId: entries.publicId,
      name: entries.name,
      bio: entries.bio,
      photoUrl: entries.photoUrl,
      theme: entries.theme,
      giftLinks: entries.giftLinks,
      totalCents: entries.totalCents,
    })
    .from(entries)
    .where(and(eq(entries.boardId, board.id), eq(entries.status, "live")))
    .orderBy(desc(entries.totalCents), asc(entries.totalReachedAt));

  return { md, year, boardId: board.id, entries: rows.map((row, i) => ({ ...row, rank: i + 1 })) };
}
