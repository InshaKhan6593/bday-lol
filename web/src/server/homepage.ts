import type { BoardTypeSettings } from "@/config/board-types";
import type { ThemeKey } from "@/config/themes";
import type { Executor } from "@/db";
import { boardClosesAt, nextDates, zonedDate, type MonthDay } from "@/lib/birthday";
import { getBirthdaySettings, getCurrentBoard, type RankedEntry } from "./leaderboard";

/** How many dates the "Coming up" row shows (decided, 07 B10). */
const COMING_UP_DAYS = 4;
/** Avatars in the "X others are celebrating" bar. */
const OTHERS_AVATARS = 4;

export type ComingUpDay = { md: MonthDay; leaderName: string | null; topTotalCents: number | null };

export type HomepageData = {
  settings: BoardTypeSettings;
  today: MonthDay;
  /** The instant today's board closes (midnight ET). Drives the countdown. */
  dayEndsAt: string;
  /** Server "now", so the countdown agrees with DEV_NOW in development. */
  serverNow: string;
  theme: ThemeKey;
  leader: RankedEntry | null;
  /** Totals of everyone else on today's board, for Boost box ranks. */
  otherTotalsCents: number[];
  others: { count: number; preview: RankedEntry[] };
  comingUp: ComingUpDay[];
};

export async function getHomepageData(db: Executor, instant: Date): Promise<HomepageData> {
  const { typeId, settings } = await getBirthdaySettings(db);
  const todayDate = zonedDate(instant, settings.timezone);
  const today = { month: todayDate.month, day: todayDate.day };

  // Sequential on purpose: a transaction's single connection can't run queries in parallel.
  const board = await getCurrentBoard(db, typeId, settings, today, instant);
  const upcoming = [];
  for (const { month, day } of nextDates(todayDate, COMING_UP_DAYS)) {
    upcoming.push(await getCurrentBoard(db, typeId, settings, { month, day }, instant));
  }

  const [leader = null, ...rest] = board.entries;
  return {
    settings,
    today,
    dayEndsAt: boardClosesAt(today, todayDate.year, settings.timezone).toISOString(),
    serverNow: instant.toISOString(),
    theme: leader?.theme ?? settings.defaultTheme,
    leader,
    otherTotalsCents: rest.map((e) => e.totalCents),
    others: { count: rest.length, preview: rest.slice(0, OTHERS_AVATARS) },
    comingUp: upcoming.map((b) => ({
      md: b.md,
      leaderName: b.entries[0]?.name ?? null,
      topTotalCents: b.entries[0]?.totalCents ?? null,
    })),
  };
}
