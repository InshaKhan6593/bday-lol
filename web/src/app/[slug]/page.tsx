import type { Metadata } from "next";
import { connection } from "next/server";
import { DatePageView, type DateQuery } from "@/components/date/DatePageView";
import { db } from "@/db";
import { formatLong } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { routes } from "@/lib/routes";
import { getDatePageData } from "@/server/date-page";
import { dateFromSlug } from "./date-from-slug";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<DateQuery>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const md = dateFromSlug((await params).slug);
  const label = formatLong(md);
  return {
    title: `${label} Birthday: How Common It Is, Famous Birthdays & Who's #1 Today`,
    description: `Everyone celebrating a birthday on ${label}, ranked. See who owns the day, send them a gift, famous people born on ${label}, and bid to take the top spot.`,
    alternates: { canonical: routes.date(md) },
  };
}

/** Find your birthday: one date's board. Rendered per request (bids and midnight ET change it). */
export default async function DatePage({ params, searchParams }: Props) {
  const md = dateFromSlug((await params).slug);
  await connection();
  const page = await getDatePageData(db, md, now());
  return <DatePageView md={md} page={page} query={await searchParams} />;
}
