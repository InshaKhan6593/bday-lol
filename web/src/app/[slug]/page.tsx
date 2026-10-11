import type { Metadata } from "next";
import { connection } from "next/server";
import { cache } from "react";
import { DatePageView, type DateQuery } from "@/components/date/DatePageView";
import { MonthRoute, monthMetadata } from "@/components/month/MonthRoute";
import { db } from "@/db";
import { jsonLdScript } from "@/lib/how-it-works";
import { parseSlug, type MonthDay } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { routes } from "@/lib/routes";
import { dateDescription, dateJsonLd, dateTitle, pageMetadata } from "@/lib/seo";
import { cachedReads } from "@/server/cached";
import { getDatePageData } from "@/server/date-page";
import { pageFromSlug } from "./date-from-slug";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<DateQuery>;
};

// generateMetadata and the page read the same data: fetch it once per request.
const dateData = cache(async (month: number, day: number) => getDatePageData(db, { month, day }, now(), cachedReads));

async function dateSeo(md: MonthDay) {
  const page = await dateData(md.month, md.day);
  const title = dateTitle(md);
  const description = dateDescription({
    md,
    year: page.year,
    famous: page.famous.map((p) => p.name),
    leader: page.entries[0] ?? null,
    openBidCents: page.settings.minOpenBidCents,
  });
  return { page, title, description };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // A bad slug is left to the page, which answers 404 or redirects: thrown from here, the 404 page
  // would only be drawn in the browser.
  const parsed = parseSlug((await params).slug);
  if (!parsed) return {};
  if (parsed.kind === "month") return monthMetadata(parsed.month);
  await connection();
  const { title, description } = await dateSeo(parsed.md);
  return pageMetadata({ title, description, path: routes.date(parsed.md) }, true);
}

/**
 * A date's board (/october-7). Rendered per request: bids, the countdown and midnight ET change it.
 * Month pages (/october) are served by /months/[month], cached, through the rewrite in next.config.ts;
 * the month branch here only runs if that rewrite is ever missing.
 */
export default async function SlugPage({ params, searchParams }: Props) {
  const parsed = pageFromSlug((await params).slug);
  await connection();
  if (parsed.kind === "month") return <MonthRoute month={parsed.month} />;
  const { page, title, description } = await dateSeo(parsed.md);
  const ld = dateJsonLd(parsed.md, title, description, page.famous, new Date(page.updatedAt));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      <DatePageView md={parsed.md} page={page} query={await searchParams} />
    </>
  );
}
