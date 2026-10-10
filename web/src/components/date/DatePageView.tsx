import { BoostNotice } from "@/components/boost/BoostNotice";
import { Countdown } from "@/components/site/Countdown";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ThemeScope } from "@/components/ui";
import { formatLongNb, type MonthDay } from "@/lib/birthday";
import { parseBoostLink } from "@/lib/boost";
import { giftsOpenText, statusText } from "@/lib/date-page";
import { absoluteUrl, routes } from "@/lib/routes";
import type { DatePageData } from "@/server/date-page";
import { About } from "./About";
import { DateBoard } from "./DateBoard";
import { DateNav } from "./DateNav";
import styles from "./date.module.css";

/** boost + amount: an outbid email's "Boost to take #1 back" link. boosted: back from a boost checkout. */
export type DateQuery = { boost?: string | string[]; amount?: string | string[]; boosted?: string | string[] };

type Props = {
  md: MonthDay;
  page: DatePageData;
  query: DateQuery;
  /** A followed personal link: scroll to this person, highlight their card, show the banner. */
  focusPublicId?: string | null;
};

/** The date board page: /october-7, and /october-7/sam-rivera focused on one person. */
export function DatePageView({ md, page, query, focusPublicId = null }: Props) {
  const { status } = page;
  const isToday = status.kind === "today";
  const shareUrl = absoluteUrl(routes.date(md));

  return (
    <ThemeScope theme={page.theme} paint>
      <SiteHeader omit={["find"]} current="find" />
      <main className={styles.main}>
        <BoostNotice sessionId={query.boosted} path={routes.date(md)} />
        <div className={styles.top}>
          <DateNav md={md} today={page.today} todayTheme={page.todayTheme} calendarTops={page.calendarTops} />
          <h1 className={styles.h1}>Everyone celebrating {formatLongNb(md)}</h1>
          <p className={styles.status}>
            {status.kind === "today" ? (
              <>
                Today · Ends in{" "}
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
          dayEnd={isToday ? { endsAt: page.dayEndsAt, serverNow: page.serverNow } : null}
          initialBoost={parseBoostLink(query, page.settings.minBoostCents)}
          focusPublicId={focusPublicId}
        />

        <About
          md={md}
          year={page.year}
          famous={page.famous}
          leader={page.entries[0] ?? null}
          openBidCents={page.settings.minOpenBidCents}
        />
      </main>
      <SiteFooter />
    </ThemeScope>
  );
}
