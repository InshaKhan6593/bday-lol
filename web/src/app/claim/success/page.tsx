import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { LinkCard } from "@/components/share/LinkCard";
import { ShareButtons } from "@/components/share/ShareButtons";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PersonalLink } from "@/components/success/PersonalLink";
import { PendingPoller } from "@/components/success/PendingPoller";
import styles from "@/components/success/success.module.css";
import { Button, Kicker, ThemeScope } from "@/components/ui";
import { db } from "@/db";
import { now } from "@/lib/clock";
import { firstName } from "@/lib/people";
import { absoluteUrl, displayUrl, routes } from "@/lib/routes";
import { birthdayShareText } from "@/lib/share";
import { isCheckoutSessionId, linkCardKicker, successCopy } from "@/lib/success";
import { getClaimOutcome } from "@/server/claim-result";

export const metadata: Metadata = {
  title: "You’re on the board",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ session_id?: string | string[] }> };

/**
 * Where Stripe Checkout returns after a claim. Everything shown comes from the
 * database: the webhook decides the real rank (07 B1, B6).
 */
export default async function ClaimSuccessPage({ searchParams }: Props) {
  await connection();
  const { session_id: sessionId } = await searchParams;
  const outcome = isCheckoutSessionId(sessionId)
    ? await getClaimOutcome(db, sessionId, now())
    : ({ status: "missing" } as const);

  if (outcome.status !== "done") {
    return (
      <ThemeScope theme="butter" paint>
        <SiteHeader omit={["claim"]} mobile="back" />
        <main className={styles.main}>
          <div className={styles.lead}>
            <div className={styles.heading}>
              {outcome.status === "pending" ? (
                <>
                  <Kicker size="md" className={styles.kicker}>
                    Payment received
                  </Kicker>
                  <h1 className={styles.h1}>Finishing up…</h1>
                  <PendingPoller />
                </>
              ) : outcome.status === "expired" ? (
                <>
                  <h1 className={styles.h1}>Checkout expired.</h1>
                  <p className={styles.sub}>Nothing was charged. You can start again whenever you’re ready.</p>
                </>
              ) : (
                <>
                  <h1 className={styles.h1}>We couldn’t find that claim.</h1>
                  <p className={styles.sub}>If you just paid, your receipt email has the link to your date.</p>
                </>
              )}
            </div>
            {outcome.status !== "pending" && (
              <Button href={routes.claim()} size="2xl" shape="large" className={styles.retry}>
                Claim a birthday
              </Button>
            )}
          </div>
        </main>
        <SiteFooter />
      </ThemeScope>
    );
  }

  const { placement, you } = outcome;
  const copy = successCopy(placement);
  const personPath = routes.person(placement.md, you.slug);
  const personUrl = absoluteUrl(personPath);

  return (
    <ThemeScope theme={you.theme} paint>
      <SiteHeader omit={["claim"]} mobile="back" back={{ href: routes.claim(placement.md), label: "Back" }} />
      <main className={styles.main}>
        <div className={styles.lead}>
          <div className={styles.heading}>
            <Kicker size="md" className={styles.kicker}>
              {copy.kicker}
            </Kicker>
            <h1 className={styles.h1}>
              {copy.title.map((line, i) => (
                <span key={line} className={i === 0 ? styles.firstLine : undefined}>
                  {line}
                  {i < copy.title.length - 1 && <br />}
                </span>
              ))}
            </h1>
            <p className={styles.sub}>{copy.sub}</p>
          </div>

          <PersonalLink url={personUrl} path={personPath} help={copy.linkHelp} />

          <ShareButtons
            large
            url={personUrl}
            message={birthdayShareText(firstName(you.name))}
            className={styles.share}
          />

          <p className={styles.note}>{copy.note}</p>

          <Link href={copy.link.to === "home" ? routes.home : routes.date(placement.md)} className={styles.seeLink}>
            {copy.link.label}
          </Link>
        </div>

        <div className={styles.preview}>
          <Kicker className={styles.previewKicker}>How your link looks when shared</Kicker>
          {/* Handoff v2: the card is the claimer's own link, whatever their rank. */}
          <LinkCard
            md={placement.md}
            person={you}
            kicker={linkCardKicker(placement.when === "today")}
            displayUrl={displayUrl(personUrl)}
          />
        </div>
      </main>
      <SiteFooter />
    </ThemeScope>
  );
}
