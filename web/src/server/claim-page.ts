import type { BoardTypeSettings } from "@/config/board-types";
import type { Executor } from "@/db";
import { boardClosesAt, currentBoardYear, zonedDate, type MonthDay } from "@/lib/birthday";
import { claimMinCents, claimTarget, type ClaimTarget } from "@/lib/claim";
import { getBirthdaySettings, getCurrentBoard } from "./leaderboard";

export type ClaimPageData = {
  settings: BoardTypeSettings;
  /** The date being claimed, from ?date=. Null until one is picked (the form starts blank, handoff v2). */
  md: MonthDay | null;
  /** Year of the board the claim lands on (next year for a date that has passed). Null without a date. */
  year: number | null;
  /** Who you're trying to pass. Only a name and a total: this goes to the browser. */
  target: ClaimTarget;
  /** Smallest bid that passes the target. */
  minCents: number;
  /** Today's date and when it ends: the form warns "Today ends in 12 min…" when claiming today. */
  today: MonthDay;
  dayEndsAt: string;
  serverNow: string;
};

/** Data for /claim?date=october-7&rank=2. No date → nobody to pass yet, and the opening bid. */
export async function getClaimPageData(
  db: Executor,
  md: MonthDay | null,
  rank: number,
  instant: Date,
): Promise<ClaimPageData> {
  const { typeId, settings } = await getBirthdaySettings(db);
  const today = zonedDate(instant, settings.timezone);
  const board = md ? await getCurrentBoard(db, typeId, settings, md, instant) : null;
  const target = claimTarget(board?.entries ?? [], rank);
  return {
    settings,
    md,
    year: md ? currentBoardYear(md, instant, settings.timezone) : null,
    target,
    minCents: claimMinCents(target, settings),
    today: { month: today.month, day: today.day },
    dayEndsAt: boardClosesAt(today, today.year, settings.timezone).toISOString(),
    serverNow: instant.toISOString(),
  };
}
