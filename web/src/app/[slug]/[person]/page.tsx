import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { DatePageView, type DateQuery } from "@/components/date/DatePageView";
import { db } from "@/db";
import { formatLong } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { firstName } from "@/lib/people";
import { routes } from "@/lib/routes";
import { getDatePageData } from "@/server/date-page";
import { getPersonOnBoard } from "@/server/people";
import { dateFromSlug } from "../date-from-slug";

type Props = {
  params: Promise<{ slug: string; person: string }>;
  searchParams: Promise<DateQuery>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, person } = await params;
  const md = dateFromSlug(slug);
  const found = await getPersonOnBoard(db, md, person, now());
  const label = formatLong(md);
  if (!found) return { title: `${label} Birthday`, alternates: { canonical: routes.date(md) } };
  const first = firstName(found.name);
  return {
    title: `It’s ${first}’s birthday on ${label}`,
    description: `${found.name} is #${found.rank} on ${label}. Send a birthday gift or boost ${first} to the top.`,
    // The board itself is the page search engines should index.
    alternates: { canonical: routes.date(md) },
  };
}

/**
 * A personal link (handoff v2): mybday.lol/october-7/sam-rivera. The date's
 * board, scrolled to this person with their card highlighted and a "You
 * followed Sam's link…" banner. Someone no longer on this year's board
 * (removed, or last year's link) lands on the date's board instead.
 */
export default async function PersonPage({ params, searchParams }: Props) {
  const { slug, person } = await params;
  const md = dateFromSlug(slug);
  await connection();
  const page = await getDatePageData(db, md, now());
  const focus = page.entries.find((e) => e.slug === person);
  if (!focus) redirect(routes.date(md));
  return <DatePageView md={md} page={page} query={await searchParams} focusPublicId={focus.publicId} />;
}
