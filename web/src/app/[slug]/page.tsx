import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { About } from "@/components/date/About";
import { DateBoard } from "@/components/date/DateBoard";
import { DateNav } from "@/components/date/DateNav";
import styles from "@/components/date/date.module.css";
import { Countdown } from "@/components/home/Countdown";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ThemeScope } from "@/components/ui";
import { db } from "@/db";
import { formatLong, formatLongNb, parseShortSlug, parseSlug, type MonthDay } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { giftsOpenText, statusText } from "@/lib/date-page";
import { absoluteUrl, routes } from "@/lib/routes";
import { getDatePageData } from "@/server/date-page";

type Props = { params: Promise<{ slug: string }> };

/**
 * "/october-7" is a date page; "/oct-7" (the mockup's share links) redirects
 * to it. Month pages ("/october") come with the SEO step.
 */
async function dateFromParams(params: Props["params"]): Promise<MonthDay> {
  const { slug } = await params;
  const parsed = parseSlug(slug);
  if (parsed?.kind === "date") return parsed.md;
  const legacy = parsed ? null : parseShortSlug(slug);
  if (legacy) permanentRedirect(routes.date(legacy));
  notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const md = await dateFromParams(params);
  const label = formatLong(md);
  return {
    title: `${label} Birthday: How Common It Is, Famous Birthdays & Who's #1 Today`,
    description: `Everyone celebrating a birthday on ${label}, ranked. See who owns the day, send them a gift, famous people born on ${label}, and bid to take the top spot.`,
    alternates: { canonical: routes.date(md) },
  };
}

/** Find your birthday: one date's leaderboard. Rendered per request (bids and midnight ET change it). */
export default async function DatePage({ params }: Props) {
  const md = await dateFromParams(params);
  await connection();
  const page = await getDatePageData(db, md, now());
  const { status } = page;
  const isToday = status.kind === "today";
  const shareUrl = absoluteUrl(routes.date(md));

  return (
    <ThemeScope theme={page.theme} paint>
      <SiteHeader omit={["find"]} />
      <main className={styles.main}>
        <div className={styles.top}>
          <DateNav md={md} today={page.today} todayTheme={page.todayTheme} calendarTops={page.calendarTops} />
          <h1 className={styles.h1}>Everyone celebrating {formatLongNb(md)}</h1>
          <p className={styles.status}>
            {status.kind === "today" ? (
              <>
                Today · day ends in{" "}
                <Countdown endsAt={page.dayEndsAt} serverNow={page.serverNow} className={styles.countdown} />
              </>
            ) : (
              statusText(md, status)
            )}
          </p>
          {!isToday && (
            <p className={styles.giftNote}>
              Gifts can be sent on the birthday itself. Until then, share it so friends know it’s coming.
            </p>
          )}
        </div>

        <DateBoard
          key={routes.date(md)}
          md={md}
          isToday={isToday}
          giftsOpenLabel={giftsOpenText(md, status)}
          entries={page.entries}
          theme={page.theme}
          shareUrl={shareUrl}
          settings={page.settings}
        />

        <About md={md} famous={page.famous} />
      </main>
    </ThemeScope>
  );
}
