import { TZDate } from "@date-fns/tz";
import { toSlug, zonedDate, type CalendarDate, type MonthDay } from "./birthday";

/**
 * Saved pages, one set per Eastern day.
 *
 * The homepage and the date pages are saved (cached) so most visits are answered from the nearest
 * server instead of being built in the US every time. What they show depends on two things only:
 * the boards, and which day it is in Eastern Time (who owns today, "In 3 days", which year's board
 * is open). So the day is part of the saved page's address:
 *
 *   /                      → /home/2026-10-11
 *   /october-7             → /october-7/~day/2026-10-11
 *   /october-7/sam-rivera  → /october-7/~day/2026-10-11/sam-rivera
 *
 * src/proxy.ts adds the day on every request, before the cache is looked at. At midnight ET the
 * address changes, so yesterday's page is never served. A payment throws the saved pages away
 * (Stripe webhook), and open pages re-read themselves (lib/live.ts).
 */

/** "2026-10-11": the Eastern date an instant falls on. */
export function dayParam(instant: Date, timeZone: string): string {
  const { year, month, day } = zonedDate(instant, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Reads "2026-10-11" back. Null for anything that isn't a real date. */
export function parseDayParam(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const real = new Date(Date.UTC(date.year, date.month - 1, date.day));
  const same = real.getUTCFullYear() === date.year && real.getUTCMonth() === date.month - 1 && real.getUTCDate() === date.day;
  return same ? date : null;
}

/**
 * The instant a saved page is drawn with: now, kept inside the Eastern day in its address. A page
 * asked for at 11:59:59 PM and drawn a moment after midnight still shows the day it was asked for.
 */
export function instantOn(day: CalendarDate, now: Date, timeZone: string): Date {
  const start = new TZDate(day.year, day.month - 1, day.day, 0, 0, 0, timeZone).getTime();
  const end = new TZDate(day.year, day.month - 1, day.day + 1, 0, 0, 0, timeZone).getTime();
  return new Date(Math.min(Math.max(now.getTime(), start), end - 1));
}

/**
 * The name part of a personal link, as lib/people.ts makes it: lowercase letters and digits joined by
 * single hyphens. "opengraph-image" is the date page's share image, never a person.
 */
export function isPersonPart(part: string): boolean {
  return part.length <= 64 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part) && part !== "opengraph-image";
}

/** Where the saved pages live. Never linked to: visitors and crawlers only see / and /october-7. */
export const savedRoutes = {
  home: (day: string) => `/home/${day}`,
  date: (md: MonthDay, day: string) => `/${toSlug(md)}/~day/${day}`,
  /** A personal link's copy (/october-7/sam-rivera). */
  person: (md: MonthDay, day: string, person: string) => `/${toSlug(md)}/~day/${day}/${person}`,
};
