import type { Metadata } from "next";
import { connection } from "next/server";
import { PersonRoute, personMetadata } from "@/components/date/DateRoute";
import { dateFromSlug } from "../date-from-slug";

type Props = {
  params: Promise<{ slug: string; person: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, person } = await params;
  const md = dateFromSlug(slug);
  await connection();
  return personMetadata({ md, person, day: null });
}

/**
 * A personal link (handoff v2): mybday.lol/october-7/sam-rivera, drawn per request. Visitors normally
 * get the saved copy instead: src/proxy.ts sends real dates to /[slug]/~day/[date]/[person]
 * (lib/day-cache.ts). This route answers the old short links (/oct-7/sam redirects), dates that don't
 * exist, and everything if that rewrite is ever missing.
 */
export default async function PersonPage({ params }: Props) {
  const { slug, person } = await params;
  const md = dateFromSlug(slug);
  await connection();
  return <PersonRoute md={md} person={person} day={null} />;
}
