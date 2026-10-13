import type { Metadata } from "next";
import { Suspense, cache } from "react";
import { preload } from "react-dom";
import { BoostNotice } from "@/components/boost/BoostNotice";
import { ClaimBar } from "@/components/home/ClaimBar";
import { ComingUp } from "@/components/home/ComingUp";
import { FindYourDate } from "@/components/home/FindYourDate";
import { LeaderCard } from "@/components/home/LeaderCard";
import { NobodyYetCard } from "@/components/home/NobodyYetCard";
import { OthersBar } from "@/components/home/OthersBar";
import { Steps } from "@/components/home/Steps";
import styles from "@/components/home/home.module.css";
import { LiveBoard } from "@/components/site/LiveBoard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Kicker, ThemeScope } from "@/components/ui";
import { db } from "@/db";
import { formatLong, toKey } from "@/lib/birthday";
import { jsonLdScript } from "@/lib/how-it-works";
import { minToTakeTop } from "@/lib/money";
import { absoluteUrl, routes } from "@/lib/routes";
import { HOME_TITLE, homeDescription, homeJsonLd, pageMetadata } from "@/lib/seo";
import { cachedReads } from "@/server/cached";
import { getHomepageData } from "@/server/homepage";
import { pageInstant } from "@/server/page-instant";

/**
 * The homepage: today's date and whoever owns it. `day` is the Eastern day a saved copy is for
 * ("2026-10-11", lib/day-cache.ts); null draws it for this very moment (the per-request route).
 */
type Props = { day: string | null };

// generateMetadata and the page read the same data: fetch it once per render.
const homeData = cache(async (day: string | null) => getHomepageData(db, pageInstant(day), cachedReads.settings));

export async function homeMetadata(day: string | null): Promise<Metadata> {
  const home = await homeData(day);
  // The share image lives on the public URL's route (/opengraph-image); the saved copy's route has none of its own.
  // The title is used as it is: the saved copy's route sits under the layout whose "| mybday.lol" ending "/" never had.
  return pageMetadata(
    { title: HOME_TITLE, description: homeDescription(home.today, home.leader), path: routes.home, image: "/opengraph-image" },
    true,
  );
}

export async function HomeRoute({ day }: Props) {
  const home = await homeData(day);
  const { leader, settings, today } = home;
  // The #1's photo sits on another host (photo storage): start fetching it from the page's <head>,
  // before the browser has laid anything out.
  if (leader?.photoUrl) preload(leader.photoUrl, { as: "image", fetchPriority: "high" });
  const dateLabel = formatLong(today);
  const shareUrl = absoluteUrl(routes.date(today));

  return (
    <ThemeScope theme={home.theme} paint>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(homeJsonLd(homeDescription(today, leader))) }}
      />
      <LiveBoard boardKey={toKey(today)} version={home.version} />
      <SiteHeader current="home" />
      <main className={styles.main}>
        <Suspense fallback={null}>
          <BoostNotice path={routes.home} />
        </Suspense>
        <div className={styles.hero}>
          <h1 className={styles.date}>{dateLabel}</h1>
          <Kicker as="p" size="lg" className={styles.kicker}>
            {leader ? "Today’s birthday belongs to" : "Today’s birthday is up for grabs"}
          </Kicker>
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
              dayEnd={{ endsAt: home.dayEndsAt }}
            />
          ) : (
            <NobodyYetCard shareUrl={shareUrl} />
          )}
          <ClaimBar
            empty={!leader}
            today={today}
            ownPriceCents={minToTakeTop(leader?.totalCents ?? null, settings)}
            dayEndsAt={home.dayEndsAt}
          />
        </div>

        {leader && home.others.count > 0 && (
          <OthersBar count={home.others.count} preview={home.others.preview} today={today} dateLabel={dateLabel} />
        )}

        <ComingUp days={home.comingUp} today={today} openBidCents={settings.minOpenBidCents} />
        <Steps />
        <FindYourDate openBidCents={settings.minOpenBidCents} />
      </main>
      <SiteFooter />
    </ThemeScope>
  );
}
