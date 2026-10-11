import { NextResponse, type NextRequest } from "next/server";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { parseSlug } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { dayParam, savedRoutes } from "@/lib/day-cache";

/**
 * Runs before the cache on every homepage and date-page request, and sends it to that page's saved
 * copy for today's Eastern date (lib/day-cache.ts):
 *
 *   /            → /home/2026-10-11
 *   /october-7   → /october-7/~day/2026-10-11
 *
 * The address in the browser doesn't change. Anything that isn't a real date (/oct-7, /february-30,
 * /october) is left to its own route.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const day = dayParam(now(), BIRTHDAY_BOARD_TYPE.settings.timezone);
  let saved: string | null = null;
  if (pathname === "/") {
    saved = savedRoutes.home(day);
  } else {
    const parsed = parseSlug(pathname.slice(1));
    if (parsed?.kind === "date") saved = savedRoutes.date(parsed.md, day);
  }
  if (!saved) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = saved;
  return NextResponse.rewrite(url);
}

export const config = {
  // "/" and one-part month-day paths only. Kept in step with MONTH_NAMES in next.config.ts.
  matcher: [
    "/",
    "/:slug((?:january|february|march|april|may|june|july|august|september|october|november|december)-[1-9]\\d?)",
  ],
};
