import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DateRoute, dateMetadata } from "@/components/date/DateRoute";
import { parseSlug } from "@/lib/birthday";

type Props = { params: Promise<{ slug: string; date: string }> };

/**
 * A date board's saved copy for one Eastern day. Its public URL is /october-7: src/proxy.ts adds
 * today's date on every request (lib/day-cache.ts), so "Today", "In 3 days" and the year's board
 * change at midnight ET by themselves.
 *
 * Thrown away the moment a payment lands (the Stripe webhook revalidates this route; the date
 * picker shows every date's top bid) and rebuilt at most every 5 minutes otherwise. Nothing is built
 * ahead, so the build needs no database for it.
 */
export const revalidate = 300;
export function generateStaticParams(): Array<{ slug: string; date: string }> {
  return [];
}

const dateFromParam = (slug: string) => {
  const parsed = parseSlug(slug);
  return parsed?.kind === "date" ? parsed.md : null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, date } = await params;
  const md = dateFromParam(slug);
  return md ? dateMetadata({ md, day: date }) : {};
}

export default async function SavedDatePage({ params }: Props) {
  const { slug, date } = await params;
  const md = dateFromParam(slug);
  if (!md) notFound();
  return <DateRoute md={md} day={date} />;
}
