import type { MetadataRoute } from "next";
import { db } from "@/db";
import { allMonthDays, toKey } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { absoluteUrl, routes } from "@/lib/routes";
import { CONTENT_UPDATED } from "@/lib/seo";
import { getFamousRefreshedAt } from "@/server/famous";
import { getBirthdaySettings, getBoardActivity } from "@/server/leaderboard";
import { getSitePagesUpdatedAt } from "@/server/site-pages";

// Read per request: lastmod follows the boards, which change with every payment.
export const dynamic = "force-dynamic";

const latest = (...dates: Array<Date | undefined>) =>
  new Date(Math.max(...dates.filter((d): d is Date => d !== undefined).map((d) => d.getTime())));

/**
 * /sitemap.xml: home, How it works, Terms, Privacy, the 12 month pages and the
 * 366 date pages (06-seo.md). lastmod is when each page's data last changed:
 * a claim or boost on its board, the famous-people refresh, or its own text
 * (claude-seo seo-programmatic: "lastmod reflects actual data update").
 * Personal links, Claim and Success pages stay out (canonical elsewhere or noindex).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const instant = now();
  const { typeId } = await getBirthdaySettings(db);
  const boards = await getBoardActivity(db, typeId, instant);
  const famous = await getFamousRefreshedAt(db);
  const legal = await getSitePagesUpdatedAt(db);

  const dates = allMonthDays().map((md) => {
    const key = toKey(md);
    return { md, lastModified: latest(CONTENT_UPDATED, boards[key], famous[key]) };
  });
  const months = Array.from({ length: 12 }, (_, i) => ({
    url: absoluteUrl(routes.month(i + 1)),
    lastModified: latest(CONTENT_UPDATED, ...dates.filter((d) => d.md.month === i + 1).map((d) => d.lastModified)),
  }));

  return [
    { url: absoluteUrl(routes.home), lastModified: latest(CONTENT_UPDATED, ...Object.values(boards)) },
    { url: absoluteUrl(routes.howItWorks), lastModified: CONTENT_UPDATED },
    { url: absoluteUrl(routes.terms), lastModified: latest(CONTENT_UPDATED, legal.terms) },
    { url: absoluteUrl(routes.privacy), lastModified: latest(CONTENT_UPDATED, legal.privacy) },
    ...months,
    ...dates.map(({ md, lastModified }) => ({ url: absoluteUrl(routes.date(md)), lastModified })),
  ];
}
