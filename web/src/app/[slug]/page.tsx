import type { Metadata } from "next";
import { connection } from "next/server";
import { DateRoute, dateMetadata } from "@/components/date/DateRoute";
import { MonthRoute, monthMetadata } from "@/components/month/MonthRoute";
import { parseSlug } from "@/lib/birthday";
import { pageFromSlug } from "./date-from-slug";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // A bad slug is left to the page, which answers 404 or redirects: thrown from here, the 404 page
  // would only be drawn in the browser.
  const parsed = parseSlug((await params).slug);
  if (!parsed) return {};
  if (parsed.kind === "month") return monthMetadata(parsed.month);
  await connection();
  return dateMetadata({ md: parsed.md, day: null });
}

/**
 * A date's board (/october-7), drawn per request. Visitors normally get the saved copy instead:
 * src/proxy.ts sends real dates to /[slug]/~day/[date] (lib/day-cache.ts). This route answers the old
 * short links (/oct-7 redirects), dates that don't exist (/february-30 is a 404), and everything if
 * that rewrite is ever missing. Month pages (/october) are served by /months/[month] the same way.
 */
export default async function SlugPage({ params }: Props) {
  const parsed = pageFromSlug((await params).slug);
  await connection();
  if (parsed.kind === "month") return <MonthRoute month={parsed.month} />;
  return <DateRoute md={parsed.md} day={null} />;
}
