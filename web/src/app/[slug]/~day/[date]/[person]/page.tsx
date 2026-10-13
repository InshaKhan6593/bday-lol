import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonRoute, personMetadata } from "@/components/date/DateRoute";
import { parseSlug } from "@/lib/birthday";
import { isPersonPart } from "@/lib/day-cache";

type Props = { params: Promise<{ slug: string; date: string; person: string }> };

/**
 * A personal link's saved copy for one Eastern day. Its public URL is /october-7/sam-rivera:
 * src/proxy.ts adds today's date on every request (lib/day-cache.ts), like the date page next to it.
 * These are the links people share, so most visitors arrive on one.
 *
 * Thrown away with the date pages the moment a payment lands or the admin changes a board, and
 * rebuilt at most every 5 minutes otherwise. Nothing is built ahead, so the build needs no database.
 */
export const revalidate = 300;
export function generateStaticParams(): Array<{ slug: string; date: string; person: string }> {
  return [];
}

const dateFromParam = (slug: string) => {
  const parsed = parseSlug(slug);
  return parsed?.kind === "date" ? parsed.md : null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, date, person } = await params;
  const md = dateFromParam(slug);
  return md && isPersonPart(person) ? personMetadata({ md, person, day: date }) : {};
}

export default async function SavedPersonPage({ params }: Props) {
  const { slug, date, person } = await params;
  const md = dateFromParam(slug);
  if (!md || !isPersonPart(person)) notFound();
  return <PersonRoute md={md} person={person} day={date} />;
}
