import type { BoardTypeSettings } from "@/config/board-types";
import type { ThemeKey } from "@/config/themes";
import type { Executor } from "@/db";
import { boardClosesAt, nextDates, toKey, zonedDate, type MonthDay } from "@/lib/birthday";
import { getBirthdaySettings, getCurrentBoard, getCurrentLeaders, type RankedEntry } from "./leaderboard";

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

export async function getHomepageData(
  db: Executor,
  instant: Date,
  /** The pages pass a cached read (server/cached.ts): the settings are the same for every visitor. */
  readSettings: () => Promise<{ typeId: number; settings: BoardTypeSettings }> = () => getBirthdaySettings(db),
): Promise<HomepageData> {
  const { typeId, settings } = await readSettings();
  const todayDate = zonedDate(instant, settings.timezone);
  const today = { month: todayDate.month, day: todayDate.day };

  // Sequential on purpose: a transaction's single connection can't run queries in parallel.
  const board = await getCurrentBoard(db, typeId, settings, today, instant);
  // "Coming up" only needs each date's #1: one query for all four dates.
  const upcoming = nextDates(todayDate, COMING_UP_DAYS).map(({ month, day }) => ({ month, day }));
  const leaders = await getCurrentLeaders(db, typeId, instant, upcoming.map(toKey));

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
    comingUp: upcoming.map((md) => ({
      md,
      leaderName: leaders[toKey(md)]?.name ?? null,
      topTotalCents: leaders[toKey(md)]?.totalCents ?? null,
    })),
  };
}
