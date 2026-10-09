import type { BoardTypeSettings } from "@/config/board-types";
import type { Executor } from "@/db";
import { currentBoardYear, zonedDate, type MonthDay } from "@/lib/birthday";
import { claimMinCents, claimTarget, type ClaimTarget } from "@/lib/claim";
import { getBirthdaySettings, getCurrentBoard } from "./leaderboard";

export type ClaimPageData = {
  settings: BoardTypeSettings;
  /** The date being claimed: from ?date=, or today. */
  md: MonthDay;
  /** Year of the board the claim lands on (next year for a date that has passed). */
  year: number;
  /** Who you're trying to pass. Only a name and a total: this goes to the browser. */
  target: ClaimTarget;
  /** Smallest bid that passes the target. */
  minCents: number;
};

/** Data for /claim?date=october-7&rank=2. No date → today's date. */
export async function getClaimPageData(
  db: Executor,
  md: MonthDay | null,
  rank: number,
  instant: Date,
): Promise<ClaimPageData> {
  const { typeId, settings } = await getBirthdaySettings(db);
  const today = zonedDate(instant, settings.timezone);
  const date = md ?? { month: today.month, day: today.day };
  const board = await getCurrentBoard(db, typeId, settings, date, instant);
  const target = claimTarget(board.entries, rank);
  return {
    settings,
    md: date,
    year: currentBoardYear(date, instant, settings.timezone),
    target,
    minCents: claimMinCents(target, settings),
  };
}
