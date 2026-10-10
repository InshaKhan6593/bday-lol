import type { Metadata } from "next";
import { connection } from "next/server";
import { cache } from "react";
import { BoostNotice } from "@/components/boost/BoostNotice";
import { ClaimBar } from "@/components/home/ClaimBar";
import { ComingUp } from "@/components/home/ComingUp";
import { LeaderCard } from "@/components/home/LeaderCard";
import { NobodyYetCard } from "@/components/home/NobodyYetCard";
import { OthersBar } from "@/components/home/OthersBar";
import { ReminderSignup } from "@/components/home/ReminderSignup";
import { Steps } from "@/components/home/Steps";
import styles from "@/components/home/home.module.css";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Kicker, ThemeScope } from "@/components/ui";
import { db } from "@/db";
import { formatLong } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { minToTakeTop } from "@/lib/money";
import { jsonLdScript } from "@/lib/how-it-works";
import { absoluteUrl, routes } from "@/lib/routes";
import { HOME_TITLE, homeDescription, homeJsonLd, pageMetadata } from "@/lib/seo";
import { getHomepageData } from "@/server/homepage";

/** Today's date and whoever owns it. Rendered per request: it changes with every bid and at midnight ET. */
type Props = { searchParams: Promise<{ boosted?: string | string[] }> };

// generateMetadata and the page read the same data: fetch it once per request.
const homeData = cache(async () => getHomepageData(db, now()));

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const home = await homeData();
  return pageMetadata({ title: HOME_TITLE, description: homeDescription(home.today, home.leader), path: routes.home });
}

export default async function HomePage({ searchParams }: Props) {
  await connection();
  const home = await homeData();
  const { leader, settings, today } = home;
  const dateLabel = formatLong(today);
  const shareUrl = absoluteUrl(routes.date(today));

  return (
    <ThemeScope theme={home.theme} paint>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(homeJsonLd(homeDescription(today, leader))) }}
      />
      <SiteHeader current="home" />
      <main className={styles.main}>
        <BoostNotice sessionId={(await searchParams).boosted} path={routes.home} />
        <div className={styles.hero}>
          <Kicker size="lg" className={styles.kicker}>
            {leader ? "Today’s birthday belongs to" : "Today’s birthday is up for grabs"}
          </Kicker>
          <h1 className={styles.date}>{dateLabel}</h1>
        </div>

        <div className={styles.today}>
          {leader ? (
            <LeaderCard
              leader={leader}
              shareUrl={shareUrl}
              dateLabel={dateLabel}
              theme={home.theme}
              otherTotalsCents={home.otherTotalsCents}
              settings={settings}
              dayEnd={{ endsAt: home.dayEndsAt, serverNow: home.serverNow }}
            />
          ) : (
            <NobodyYetCard shareUrl={shareUrl} />
          )}
          <ClaimBar
            empty={!leader}
            today={today}
            ownPriceCents={minToTakeTop(leader?.totalCents ?? null, settings)}
            dayEndsAt={home.dayEndsAt}
            serverNow={home.serverNow}
          />
        </div>

        {leader && home.others.count > 0 && (
          <OthersBar count={home.others.count} preview={home.others.preview} today={today} dateLabel={dateLabel} />
        )}

        <ComingUp days={home.comingUp} today={today} openBidCents={settings.minOpenBidCents} />
        <Steps />
        <ReminderSignup />
      </main>
      <SiteFooter />
    </ThemeScope>
  );
}
