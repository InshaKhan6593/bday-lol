import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { zonedDate } from "@/lib/birthday";
import type { SharedReads } from "./date-page";
import { getFamousForDate } from "./famous";
import { getBirthdaySettings, getCurrentTopTotals } from "./leaderboard";

/**
 * Cached versions of the reads that are the same for every visitor and change slowly.
 *
 * The homepage and date pages are rendered per request, because bids, the countdown and midnight ET
 * must be exact: the board being viewed and today's board are always read fresh. These three reads
 * don't need that, and under load they were most of each page's database work (load test, 2026-10-11).
 *
 * | Read | Kept for | Dropped early when |
 * |---|---|---|
 * | Board settings | 5 minutes | (nothing changes them outside a deploy yet) |
 * | A date's famous people | 1 hour | the monthly refresh runs (/api/cron/famous) |
 * | Top bid per date (date picker) | 30 seconds | a payment lands (Stripe webhook) |
 *
 * Money rules never read these: claims and boosts check settings and totals in the database.
 * TODO(step 10): the admin must revalidate `famous` after hiding a person and `settings` after editing them.
 */
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

function easternDate(at: Date): string {
  const { year, month, day } = zonedDate(at, BIRTHDAY_BOARD_TYPE.settings.timezone);
  return `${year}-${month}-${day}`;
}

export const cachedReads: SharedReads = {
  settings,
  topTotals: topTotalsOn,
  famous: (md, year) => famous(md.month, md.day, year),
};
