import type { Metadata } from "next";
import { connection } from "next/server";
import { cache } from "react";
import { DatePageView, type DateQuery } from "@/components/date/DatePageView";
import { MonthPageView } from "@/components/month/MonthPageView";
import { db } from "@/db";
import { jsonLdScript } from "@/lib/how-it-works";
import type { MonthDay } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { routes } from "@/lib/routes";
import {
  dateDescription,
  dateJsonLd,
  dateTitle,
  monthDescription,
  monthJsonLd,
  monthTitle,
  pageMetadata,
} from "@/lib/seo";
import { getDatePageData } from "@/server/date-page";
import { getMonthPageData } from "@/server/month-page";
import { pageFromSlug } from "./date-from-slug";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<DateQuery>;
};

// generateMetadata and the page read the same data: fetch it once per request.
const dateData = cache(async (month: number, day: number) => getDatePageData(db, { month, day }, now()));
const monthData = cache(async (month: number) => getMonthPageData(db, month, now()));

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

async function monthSeo(month: number) {
  const page = await monthData(month);
  return { page, title: monthTitle(month), description: monthDescription(month, page.claimed, page.rows.length) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parsed = pageFromSlug((await params).slug);
  await connection();
  if (parsed.kind === "month") {
    const { title, description } = await monthSeo(parsed.month);
    return pageMetadata({ title, description, path: routes.month(parsed.month) }, true);
  }
  const { title, description } = await dateSeo(parsed.md);
  return pageMetadata({ title, description, path: routes.date(parsed.md) }, true);
}

/** A date's board (/october-7) or a month (/october). Rendered per request: bids and midnight ET change them. */
export default async function SlugPage({ params, searchParams }: Props) {
  const parsed = pageFromSlug((await params).slug);
  await connection();
  if (parsed.kind === "month") {
    const { page, title, description } = await monthSeo(parsed.month);
    const ld = monthJsonLd(parsed.month, title, description, page.rows.map((r) => r.md));
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
        <MonthPageView page={page} />
      </>
    );
  }
  const { page, title, description } = await dateSeo(parsed.md);
  const ld = dateJsonLd(parsed.md, title, description, page.famous);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      <DatePageView md={parsed.md} page={page} query={await searchParams} />
    </>
  );
}
