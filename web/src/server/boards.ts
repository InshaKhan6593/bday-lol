import { and, eq } from "drizzle-orm";
import type { BoardTypeSettings } from "@/config/board-types";
import type { Executor } from "@/db";
import { boards, boardTypes } from "@/db/schema";
import { boardClosesAt, boardOpensAt, currentBoardYear, toKey, type MonthDay } from "@/lib/birthday";

type BoardType = typeof boardTypes.$inferSelect;
type Board = typeof boards.$inferSelect;

export async function getBoardType(db: Executor, slug: string): Promise<BoardType> {
  const [type] = await db.select().from(boardTypes).where(eq(boardTypes.slug, slug)).limit(1);
  if (!type) throw new Error(`Board type "${slug}" not found. Run the seed.`);
  return type;
}

/**
 * Returns the board for (type, month-day, year), creating it if needed.
 * Boards are created lazily: the first claim on a date-year makes the row.
 */
export async function ensureBoard(
  db: Executor,
  type: { id: number; settings: BoardTypeSettings },
  md: MonthDay,
  year: number,
): Promise<Board> {
  const key = toKey(md);
  const period = String(year);
  const tz = type.settings.timezone;

  await db
    .insert(boards)
    .values({
      boardTypeId: type.id,
      key,
      period,
      opensAt: boardOpensAt(md, year, tz),
      closesAt: boardClosesAt(md, year, tz),
    })
    .onConflictDoNothing({ target: [boards.boardTypeId, boards.key, boards.period] });

  const [board] = await db
    .select()
    .from(boards)
    .where(and(eq(boards.boardTypeId, type.id), eq(boards.key, key), eq(boards.period, period)))
    .limit(1);
  return board!;
}

/** The board that is open right now for a month-day (the one new claims go to). */
export async function ensureCurrentBoard(
  db: Executor,
  type: { id: number; settings: BoardTypeSettings },
  md: MonthDay,
  instant: Date,
): Promise<Board> {
  return ensureBoard(db, type, md, currentBoardYear(md, instant, type.settings.timezone));
}
