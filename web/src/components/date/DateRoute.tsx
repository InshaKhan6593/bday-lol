import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import { DatePageView } from "@/components/date/DatePageView";
import { db } from "@/db";
import { formatLong, type MonthDay } from "@/lib/birthday";
import { jsonLdScript } from "@/lib/how-it-works";
import { firstName } from "@/lib/people";
import { routes } from "@/lib/routes";
import { dateDescription, dateJsonLd, dateTitle, pageMetadata } from "@/lib/seo";
import { cachedReads } from "@/server/cached";
import { getDatePageData } from "@/server/date-page";
import { pageInstant } from "@/server/page-instant";

/**
 * A date's board (/october-7). `day` is the Eastern day a saved copy is for ("2026-10-11",
 * lib/day-cache.ts); null draws it for this very moment (the per-request route).
 */
type Props = { md: MonthDay; day: string | null };

// generateMetadata and the page read the same data: fetch it once per render.
const dateData = cache(async (month: number, day: number, on: string | null) =>
  getDatePageData(db, { month, day }, pageInstant(on), cachedReads),
);

async function dateSeo(md: MonthDay, on: string | null) {
  const page = await dateData(md.month, md.day, on);
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

export async function dateMetadata({ md, day }: Props): Promise<Metadata> {
  const { title, description } = await dateSeo(md, day);
  // The share image lives on the public URL's route (/october-7/opengraph-image), not on the saved copy's.
  return pageMetadata({ title, description, path: routes.date(md), image: `${routes.date(md)}/opengraph-image` }, true);
}

export async function DateRoute({ md, day }: Props) {
  const { page, title, description } = await dateSeo(md, day);
  const ld = dateJsonLd(md, title, description, page.famous, new Date(page.updatedAt));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      <DatePageView md={md} page={page} />
    </>
  );
}

/**
 * A personal link (/october-7/sam-rivera): the date's board, scrolled to this person with their card
 * highlighted. `on` is the Eastern day of a saved copy, like `day` above.
 */
type PersonProps = { md: MonthDay; person: string; day: string | null };

export async function personMetadata({ md, person, day }: PersonProps): Promise<Metadata> {
  const page = await dateData(md.month, md.day, day);
  const at = page.entries.findIndex((entry) => entry.slug === person);
  const found = page.entries[at];
  if (!found) return { title: { absolute: dateTitle(md) }, alternates: { canonical: routes.date(md) } };
  const label = formatLong(md);
  const first = firstName(found.name);
  const title = `It’s ${first}’s birthday on ${label}`;
  const description = `${found.name} is #${at + 1} on ${label}. Send a birthday gift or boost ${first} to the top.`;
  const path = routes.person(md, person);
  return {
    // The share image lives on the public URL's route, not on the saved copy's.
    ...pageMetadata({ title, description, path, image: `${path}/opengraph-image` }),
    // The board itself is the page search engines should index; the personal link is for sharing.
    alternates: { canonical: routes.date(md) },
  };
}

/** Someone no longer on this year's board (removed, or last year's link) lands on the date's board instead. */
export async function PersonRoute({ md, person, day }: PersonProps) {
  const page = await dateData(md.month, md.day, day);
  const focus = page.entries.find((entry) => entry.slug === person);
  if (!focus) redirect(routes.date(md));
  return <DatePageView md={md} page={page} focusPublicId={focus.publicId} />;
}
