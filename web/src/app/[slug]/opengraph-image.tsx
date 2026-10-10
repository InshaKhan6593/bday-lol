import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/db";
import { DAYS_IN_MONTH, formatLong, MONTHS_SHORT, MONTHS, parseSlug } from "@/lib/birthday";
import { birthstone, signsInMonth } from "@/lib/facts";
import { now } from "@/lib/clock";
import { formatUsd } from "@/lib/money";
import { routes } from "@/lib/routes";
import { linkCardKicker } from "@/lib/success";
import { getDatePageData } from "@/server/date-page";
import { cardImage, OG_CONTENT_TYPE, OG_SIZE } from "@/server/og-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Birthday card from mybday.lol";

/** Share image for a date page (its #1, or the date up for grabs) and for a month page. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const parsed = parseSlug((await params).slug);
  if (!parsed) notFound();
  await connection();

  if (parsed.kind === "month") {
    const m = parsed.month;
    const signs = signsInMonth(m, DAYS_IN_MONTH[m - 1]!).map((s) => s.sign);
    return cardImage({
      theme: "butter",
      kicker: "Birthdays by month",
      headline: MONTHS[m - 1]!,
      line: `${signs.join(" & ")} · ${birthstone(m)}`,
      avatar: { symbol: MONTHS_SHORT[m - 1]!.toUpperCase() },
      path: routes.month(m),
    });
  }

  const md = parsed.md;
  const page = await getDatePageData(db, md, now());
  const leader = page.entries[0];
  return cardImage(
    leader
      ? {
          theme: leader.theme,
          kicker: linkCardKicker(page.status.kind === "today"),
          headline: formatLong(md),
          line: leader.name,
          avatar: { name: leader.name, photoUrl: leader.photoUrl },
          path: routes.date(md),
        }
      : {
          theme: page.theme,
          kicker: "Up for grabs",
          headline: formatLong(md),
          line: `Claim it from ${formatUsd(page.settings.minOpenBidCents)}`,
          avatar: { symbol: "?" },
          path: routes.date(md),
        },
  );
}
