import { db } from "@/db";
import { now } from "@/lib/clock";
import { refreshFamousMonth } from "@/server/famous";
import { wikidataProvider } from "@/server/famous-source";

/** A month is ~31 Wikidata queries and ~900 pageview lookups (about 2 minutes): allow the Pro plan's maximum. */
export const maxDuration = 800;

/**
 * Monthly refresh of "Famous people born on [date]" (06-seo.md §2). Vercel Cron
 * calls it on days 1–12 of every month (vercel.json) and each call refreshes the
 * month with that number, so no single run has to fetch the whole year.
 * `?month=10` refreshes one month by hand. Locally: `pnpm famous:refresh`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") return new Response("CRON_SECRET is not set", { status: 500 });
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const instant = now();
  const month = Number(new URL(request.url).searchParams.get("month") ?? instant.getUTCDate());
  if (!Number.isInteger(month) || month < 1 || month > 12) return Response.json({ skipped: true, month });
  const run = await refreshFamousMonth(db, wikidataProvider, month, instant);
  return Response.json({ month, ...run });
}
