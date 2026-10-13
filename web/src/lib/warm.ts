import { DAYS_IN_MONTH, parseKey } from "./birthday";
import { routes } from "./routes";

/**
 * Building saved pages before anyone asks for them.
 *
 * The homepage, date pages and personal links are saved copies (lib/day-cache.ts). A copy that has
 * been thrown away is built again by the next visit, and that one visitor waits for it. So the server
 * asks for the pages itself: right after a change, for the pages that change shows on, and once a
 * night for all of them, when the Eastern day turns over and every copy's address changes.
 *
 * This file decides which pages; server/warm.ts fetches them.
 */

/**
 * The pages a change to one board shows on: the homepage (today's #1 and the week ahead), the date's
 * own page, its month, and any personal links given. `boardKey` is "10-07".
 */
export function pagesAfterBoardChange(boardKey: string, personSlugs: Array<string | null> = []): string[] {
  const md = parseKey(boardKey);
  if (!md) return [routes.home];
  const people = personSlugs.flatMap((slug) => (slug ? [routes.person(md, slug)] : []));
  return [routes.home, routes.date(md), routes.month(md.month), ...people];
}

/** Every saved page that needs no name to find: the homepage, the three text pages, 12 months, 366 dates. */
export function allSavedPages(): string[] {
  const months = DAYS_IN_MONTH.map((_, i) => routes.month(i + 1));
  const dates = DAYS_IN_MONTH.flatMap((days, i) => Array.from({ length: days }, (_, d) => routes.date({ month: i + 1, day: d + 1 })));
  return [routes.home, routes.howItWorks, routes.terms, routes.privacy, ...months, ...dates];
}

/**
 * Did this answer come from a copy that was already saved? After a change the old copy has just
 * been thrown away, and an answer still served from it means the request arrived too early.
 */
export function servedFromOldCopy(cacheHeader: string | null): boolean {
  const state = cacheHeader?.toUpperCase();
  return state === "HIT" || state === "STALE";
}
