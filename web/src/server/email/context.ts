import { eq } from "drizzle-orm";
import type { BoardTypeSettings } from "@/config/board-types";
import type { Executor } from "@/db";
import { boards, entries } from "@/db/schema";
import { parseKey, toKey, zonedDate, type CalendarDate, type MonthDay } from "@/lib/birthday";
import { absoluteUrl, routes } from "@/lib/routes";
import { getBirthdaySettings, getRankedEntries, type RankedEntry } from "../leaderboard";

/** Everything an email about one entry needs: who, which board, where they stand right now. */
export type EntryContext = {
  entry: {
    id: string;
    publicId: string;
    name: string;
    bio: string;
    /** Absolute, so it loads in an inbox. */
    photoUrl: string | null;
    theme: (typeof entries.$inferSelect)["theme"];
    giftLinks: (typeof entries.$inferSelect)["giftLinks"];
    ownerEmail: string | null;
    live: boolean;
  };
  md: MonthDay;
  year: number;
  closesAt: Date;
  ranked: RankedEntry[];
  /** This entry in the ranking (missing if it isn't live). */
  mine: RankedEntry | undefined;
  settings: BoardTypeSettings;
  today: CalendarDate;
  /** The board's day is today (and hasn't ended). */
  isToday: boolean;
  dateUrl: string;
};

export async function loadEntryContext(db: Executor, entryId: string, instant: Date): Promise<EntryContext | null> {
  const [row] = await db
    .select({ entry: entries, key: boards.key, period: boards.period, closesAt: boards.closesAt })
    .from(entries)
    .innerJoin(boards, eq(boards.id, entries.boardId))
    .where(eq(entries.id, entryId))
    .limit(1);
  const md = row ? parseKey(row.key) : null;
  if (!row || !md) return null;

  const { settings } = await getBirthdaySettings(db);
  const today = zonedDate(instant, settings.timezone);
  const year = Number(row.period);
  const ranked = await getRankedEntries(db, row.entry.boardId);
  const e = row.entry;
  return {
    entry: {
      id: e.id,
      publicId: e.publicId,
      name: e.name,
      bio: e.bio,
      photoUrl: e.photoUrl ? absoluteUrl(e.photoUrl) : null,
      theme: e.theme,
      giftLinks: e.giftLinks,
      ownerEmail: e.ownerEmail,
      live: e.status === "live",
    },
    md,
    year,
    closesAt: row.closesAt,
    ranked,
    mine: ranked.find((r) => r.id === e.id),
    settings,
    today,
    isToday: row.key === toKey(today) && year === today.year && row.closesAt.getTime() > instant.getTime(),
    dateUrl: absoluteUrl(routes.date(md)),
  };
}
