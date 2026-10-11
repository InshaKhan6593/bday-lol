import type { Metadata } from "next";
import { cache } from "react";
import { MonthPageView } from "@/components/month/MonthPageView";
import { db } from "@/db";
import { now } from "@/lib/clock";
import { jsonLdScript } from "@/lib/how-it-works";
import { routes } from "@/lib/routes";
import { monthDescription, monthJsonLd, monthTitle, pageMetadata } from "@/lib/seo";
import { getMonthPageData } from "@/server/month-page";

// generateMetadata and the page read the same data: fetch it once per render.
const monthData = cache(async (month: number) => getMonthPageData(db, month, now()));

async function monthSeo(month: number) {
  const page = await monthData(month);
  return { page, title: monthTitle(month), description: monthDescription(month, page.claimed, page.rows.length) };
}

export async function monthMetadata(month: number): Promise<Metadata> {
  const { title, description } = await monthSeo(month);
  // The share image lives on the public URL's route (/october/opengraph-image), not on this one.
  return pageMetadata({ title, description, path: routes.month(month), image: `${routes.month(month)}/opengraph-image` }, true);
}

export async function MonthRoute({ month }: { month: number }) {
  const { page, title, description } = await monthSeo(month);
  const ld = monthJsonLd(
    month,
    title,
    description,
    page.rows.map((r) => r.md),
    new Date(page.updatedAt),
  );
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      <MonthPageView page={page} />
    </>
  );
}
