import { db } from "@/db";
import { zonedDate } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { routes, siteOrigin } from "@/lib/routes";
import { allSavedPages } from "@/lib/warm";
import { cachedReads } from "@/server/cached";
import { getCurrentBoard } from "@/server/leaderboard";
import { warmPaths } from "@/server/warm";

/** About 380 pages, six at a time. 300 s is the most the free plan allows. */
export const maxDuration = 300;

/** Personal links warmed for today's board: the links being shared today. */
const MAX_PERSONAL_LINKS = 200;

/**
 * Builds every saved page ahead of its first visitor (lib/warm.ts). Vercel Cron calls it just after
 * midnight Eastern (vercel.json), when the day turns over and every saved copy gets a new address
 * (lib/day-cache.ts). Midnight Eastern is 04:00 UTC in summer and 05:00 in winter, so it is scheduled
 * for both hours; the run that comes before midnight finds the pages already built and changes nothing.
 *
 * Also worth calling by hand right after a deploy, which starts with no saved copies:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/warm
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") return new Response("CRON_SECRET is not set", { status: 500 });
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const instant = now();
  const { typeId, settings } = await cachedReads.settings();
  const today = zonedDate(instant, settings.timezone);
  const md = { month: today.month, day: today.day };
  const board = await getCurrentBoard(db, typeId, settings, md, instant);
  const people = board.entries.flatMap((entry) => (entry.slug ? [routes.person(md, entry.slug)] : [])).slice(0, MAX_PERSONAL_LINKS);
  // Today's pages first: if the run is ever cut short, the pages most people open are done.
  const paths = [routes.home, routes.date(md), ...people, ...allSavedPages()];
  const result = await warmPaths(paths, { origin: siteOrigin(), concurrency: 6, budgetMs: 240_000, timeoutMs: 20_000 });
  if (result.failed.length) console.warn("Pages not built ahead:", result.failed.slice(0, 20));
  return Response.json({ ...result, failed: result.failed.length });
}
