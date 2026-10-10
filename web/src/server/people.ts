import type { Executor } from "@/db";
import type { MonthDay } from "@/lib/birthday";
import { getBirthdaySettings, getCurrentBoard, type RankedEntry } from "./leaderboard";

/** Who a personal link points to on the date's current board, or null (removed, or last year's link). */
export async function getPersonOnBoard(
  db: Executor,
  md: MonthDay,
  slug: string,
  instant: Date,
): Promise<RankedEntry | null> {
  const { typeId, settings } = await getBirthdaySettings(db);
  const board = await getCurrentBoard(db, typeId, settings, md, instant);
  return board.entries.find((e) => e.slug === slug) ?? null;
}
