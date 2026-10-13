import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { toKey, zonedDate, type MonthDay } from "@/lib/birthday";
import type { SharedReads } from "./date-page";
import { getFamousForDate } from "./famous";
import { getBirthdaySettings, getCurrentTopTotals } from "./leaderboard";
import { getBoardVersion } from "./live";

/**
 * Cached versions of the reads that are the same for every visitor and change slowly.
 *
 * The homepage and date pages are themselves saved, one copy per Eastern day (lib/day-cache.ts), and
 * thrown away by a payment. When one is built, the board being viewed and today's board are read
 * fresh; these reads don't need that and are shared between pages.
 *
 * | Read | Kept for | Dropped early when |
 * |---|---|---|
 * | Board settings | 5 minutes | (nothing changes them outside a deploy yet) |
 * | A date's famous people | 1 hour | the monthly refresh runs (/api/cron/famous) |
 * | Top bid per date (date picker) | 30 seconds | a payment lands (Stripe webhook) |
 * | A board's version (open pages ask for it) | 5 seconds | a payment lands (Stripe webhook) |
 *
 * Money rules never read these: claims and boosts check settings and totals in the database.
 * The admin's actions (server/actions/admin.ts) drop `famous` after hiding a person and `boards` after
 * changing a listing, then announce the board, as the Stripe webhook does.
 */
/**
 * The routes of the saved homepage, date pages and personal links (lib/day-cache.ts), for revalidatePath(route, "page").
 * Whatever changes what those pages show must throw them away: a payment (Stripe webhook), the monthly
 * famous-people refresh, and the admin's edits.
 */
export const SAVED_PAGE_ROUTES = ["/home/[date]", "/[slug]/~day/[date]", "/[slug]/~day/[date]/[person]"] as const;

/** The saved pages that show a date's board: the date page and its personal links. */
export const SAVED_DATE_ROUTES = ["/[slug]/~day/[date]", "/[slug]/~day/[date]/[person]"] as const;

export const CACHE_TAGS = { settings: "board-settings", famous: "famous", boards: "boards" } as const;

const settings = unstable_cache(() => getBirthdaySettings(db), ["birthday-settings"], {
  revalidate: 300,
  tags: [CACHE_TAGS.settings],
});

const famous = unstable_cache(
  (month: number, day: number, year: number) => getFamousForDate(db, { month, day }, year),
  ["famous-for-date"],
  { revalidate: 3600, tags: [CACHE_TAGS.famous] },
);

// Which boards are open changes at midnight ET, so the Eastern date is part of the key: a new day never
// reads yesterday's answer. `at` is not part of it, or every request would be its own entry.
const topTotalsOn = (typeId: number, at: Date) =>
  unstable_cache(() => getCurrentTopTotals(db, typeId, at), ["top-totals", String(typeId), easternDate(at)], {
    revalidate: 30,
    tags: [CACHE_TAGS.boards],
  })();

/**
 * What every open page of a board asks, on a push and on a timer (lib/live.ts): however many people
 * are watching, the database is read at most once every 5 seconds per board.
 */
export async function cachedBoardVersion(md: MonthDay, at: Date): Promise<string> {
  const { typeId, settings: boardSettings } = await settings();
  return unstable_cache(
    () => getBoardVersion(db, typeId, boardSettings, md, at),
    ["board-version", String(typeId), toKey(md), easternDate(at)],
    { revalidate: 5, tags: [CACHE_TAGS.boards] },
  )();
}

function easternDate(at: Date): string {
  const { year, month, day } = zonedDate(at, BIRTHDAY_BOARD_TYPE.settings.timezone);
  return `${year}-${month}-${day}`;
}

export const cachedReads: SharedReads = {
  settings,
  topTotals: topTotalsOn,
  famous: (md, year) => famous(md.month, md.day, year),
};
