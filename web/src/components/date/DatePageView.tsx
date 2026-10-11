import { Suspense } from "react";
import { BoostNotice } from "@/components/boost/BoostNotice";
import { Countdown } from "@/components/site/Countdown";
import { LiveBoard } from "@/components/site/LiveBoard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ThemeScope } from "@/components/ui";
import { formatLongNb, toKey, type MonthDay } from "@/lib/birthday";
import { giftsOpenText, statusText } from "@/lib/date-page";
import { absoluteUrl, routes } from "@/lib/routes";
import type { DatePageData } from "@/server/date-page";
import { About } from "./About";
import { DateBoard } from "./DateBoard";
import { DateNav } from "./DateNav";
import styles from "./date.module.css";

type Props = {
  md: MonthDay;
  page: DatePageData;
  /** A followed personal link: scroll to this person, highlight their card, show the banner. */
  focusPublicId?: string | null;
};

/** The date board page: /october-7, and /october-7/sam-rivera focused on one person. */
export function DatePageView({ md, page, focusPublicId = null }: Props) {
  const { status } = page;
  const isToday = status.kind === "today";
  const shareUrl = absoluteUrl(routes.date(md));

  return (
    <ThemeScope theme={page.theme} paint>
      <LiveBoard boardKey={toKey(md)} version={page.version} />
      <SiteHeader omit={["find"]} current="find" />
      <main className={styles.main}>
        <Suspense fallback={null}>
          <BoostNotice path={routes.date(md)} />
        </Suspense>
        <div className={styles.top}>
          <DateNav md={md} today={page.today} todayTheme={page.todayTheme} calendarTops={page.calendarTops} />
          <h1 className={styles.h1}>Everyone celebrating {formatLongNb(md)}</h1>
          <p className={styles.status}>
            {status.kind === "today" ? (
              <>
                Today · Ends in{" "}
                <Countdown endsAt={page.dayEndsAt} className={styles.countdown} />
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
          dayEnd={isToday ? { endsAt: page.dayEndsAt } : null}
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
      <SiteFooter currentMonth={md.month} />
    </ThemeScope>
  );
}
