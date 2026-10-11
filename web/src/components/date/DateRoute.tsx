import type { Metadata } from "next";
import { cache } from "react";
import { DatePageView } from "@/components/date/DatePageView";
import { db } from "@/db";
import type { MonthDay } from "@/lib/birthday";
import { jsonLdScript } from "@/lib/how-it-works";
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
