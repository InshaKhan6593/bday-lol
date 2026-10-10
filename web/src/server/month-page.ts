import type { BoardTypeSettings } from "@/config/board-types";
import type { ThemeKey } from "@/config/themes";
import type { Executor } from "@/db";
import { currentBoardYear, DAYS_IN_MONTH, toKey, zonedDate, type MonthDay } from "@/lib/birthday";
import { getFamousNamesForMonth } from "./famous";
import { getBirthdaySettings, getCurrentLeaders, getCurrentTopTotals, getCurrentBoard, type BoardLeader } from "./leaderboard";

export type MonthDateRow = {
  md: MonthDay;
  /** The board's year: when this date next comes round. */
  year: number;
  leader: BoardLeader | null;
  /** Best-known people born on this date, best known first. */
  famous: string[];
};

export type MonthPageData = {
  settings: BoardTypeSettings;
  month: number;
  today: MonthDay;
  todayTheme: ThemeKey;
  rows: MonthDateRow[];
  /** Top total per month-day, for the calendar grid ("10-07" → cents). */
  calendarTops: Record<string, number>;
  claimed: number;
};

/** A month page (/october): every date in the month with its #1, famous names and facts (07 B13). */
export async function getMonthPageData(db: Executor, month: number, instant: Date): Promise<MonthPageData> {
  const { typeId, settings } = await getBirthdaySettings(db);
  const tz = settings.timezone;
  const t = zonedDate(instant, tz);
  const today = { month: t.month, day: t.day };
  // Sequential on purpose: a transaction's single connection can't run queries in parallel.
  const leaders = await getCurrentLeaders(db, typeId, instant, month);
  const famous = await getFamousNamesForMonth(db, month);
  const calendarTops = await getCurrentTopTotals(db, typeId, instant);
  const todayBoard = await getCurrentBoard(db, typeId, settings, today, instant);

  const rows = Array.from({ length: DAYS_IN_MONTH[month - 1]! }, (_, i) => {
    const md = { month, day: i + 1 };
    const key = toKey(md);
    return { md, year: currentBoardYear(md, instant, tz), leader: leaders[key] ?? null, famous: famous[key] ?? [] };
  });

  return {
    settings,
    month,
    today,
    todayTheme: todayBoard.entries[0]?.theme ?? settings.defaultTheme,
    rows,
    calendarTops,
    claimed: rows.filter((r) => r.leader).length,
  };
}
