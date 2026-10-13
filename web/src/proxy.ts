import { NextResponse, type NextRequest } from "next/server";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { parseSlug } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { dayParam, isPersonPart, savedRoutes } from "@/lib/day-cache";

/**
 * Runs before the cache on every homepage and date-page request, and sends it to that page's saved
 * copy for today's Eastern date (lib/day-cache.ts):
 *
 *   /                      → /home/2026-10-11
 *   /october-7             → /october-7/~day/2026-10-11
 *   /october-7/sam-rivera  → /october-7/~day/2026-10-11/sam-rivera
 *
 * The address in the browser doesn't change. Anything that isn't a real date (/oct-7, /february-30,
 * /october) or a name under one (/october-7/opengraph-image) is left to its own route.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const day = dayParam(now(), BIRTHDAY_BOARD_TYPE.settings.timezone);
  let saved: string | null = null;
  if (pathname === "/") {
    saved = savedRoutes.home(day);
  } else {
    const [slug = "", person, ...more] = pathname.slice(1).split("/");
    const parsed = parseSlug(slug);
    if (parsed?.kind === "date" && more.length === 0) {
      if (person === undefined) saved = savedRoutes.date(parsed.md, day);
      else if (isPersonPart(person)) saved = savedRoutes.person(parsed.md, day, person);
    }
  }
  if (!saved) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = saved;
  return NextResponse.rewrite(url);
}

export const config = {
  // "/", month-day paths, and one name under a month-day. Kept in step with MONTH_NAMES in next.config.ts.
  matcher: [
    "/",
    "/:slug((?:january|february|march|april|may|june|july|august|september|october|november|december)-[1-9]\\d?)",
    "/:slug((?:january|february|march|april|may|june|july|august|september|october|november|december)-[1-9]\\d?)/:person([a-z0-9][a-z0-9-]*)",
  ],
};
