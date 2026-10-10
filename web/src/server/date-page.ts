import type { BoardTypeSettings } from "@/config/board-types";
import type { ThemeKey } from "@/config/themes";
import type { Executor } from "@/db";
import type { GiftLink } from "@/db/schema";
import { boardClosesAt, zonedDate, type MonthDay } from "@/lib/birthday";
import { dateStatus, heldText, type DateStatus } from "@/lib/date-page";
import { getFamousPeople, type FamousPerson } from "./famous";
import { getBirthdaySettings, getCurrentBoard, getCurrentTopTotals, getLeaderLog } from "./leaderboard";

/** One person on the date page's list. Only public fields: this goes to the browser. */
export type DateEntry = {
  publicId: string;
  /** Personal link name: /october-7/sam-rivera. */
  slug: string | null;
  rank: number;
  name: string;
  bio: string;
  photoUrl: string | null;
  theme: ThemeKey;
  giftLinks: GiftLink[];
  totalCents: number;
  /** "On the homepage since 2:40 PM" / "Held the homepage 9:12 AM – 2:40 PM". Today only. */
  held: string | null;
};

export type DatePageData = {
  settings: BoardTypeSettings;
  md: MonthDay;
  today: MonthDay;
  /** Year of the board being shown (the next time this date comes round). */
  year: number;
  status: DateStatus;
  /** The viewed date's #1 theme, or Cloud when nobody has bid. */
  theme: ThemeKey;
  /** Today's #1 theme: the date picker paints today's cell with its ground. */
  todayTheme: ThemeKey;
  entries: DateEntry[];
  /** Top total per month-day for the date picker ("10-07" → cents). */
  calendarTops: Record<string, number>;
  famous: FamousPerson[];
  /** When today ends (midnight ET), for the countdown in the status line. */
  dayEndsAt: string;
  serverNow: string;
};

export async function getDatePageData(db: Executor, md: MonthDay, instant: Date): Promise<DatePageData> {
  const { typeId, settings } = await getBirthdaySettings(db);
  const tz = settings.timezone;
  const todayDate = zonedDate(instant, tz);
  const today = { month: todayDate.month, day: todayDate.day };
  const status = dateStatus(md, instant, tz);
  const isToday = status.kind === "today";

  // Sequential on purpose: a transaction's single connection can't run queries in parallel.
  const board = await getCurrentBoard(db, typeId, settings, md, instant);
  const todayBoard = isToday ? board : await getCurrentBoard(db, typeId, settings, today, instant);
  // Held lines exist only on today's board (decided, 07 B9).
  const log = isToday && board.boardId ? await getLeaderLog(db, board.boardId) : [];
  const calendarTops = await getCurrentTopTotals(db, typeId, instant);
  const famous = await getFamousPeople(db, md, board.year);

  return {
    settings,
    md,
    today,
    year: board.year,
    status,
    theme: board.entries[0]?.theme ?? settings.emptyTheme,
    todayTheme: todayBoard.entries[0]?.theme ?? settings.defaultTheme,
    entries: board.entries.map((e) => ({
      publicId: e.publicId,
      slug: e.slug,
      rank: e.rank,
      name: e.name,
      bio: e.bio,
      photoUrl: e.photoUrl,
      theme: e.theme,
      giftLinks: e.giftLinks,
      totalCents: e.totalCents,
      held: heldText(
        log.filter((row) => row.entryId === e.id),
        tz,
      ),
    })),
    calendarTops,
    famous,
    dayEndsAt: boardClosesAt(today, todayDate.year, tz).toISOString(),
    serverNow: instant.toISOString(),
  };
}
