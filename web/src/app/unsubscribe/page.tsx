import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button, Kicker, Surface, ThemeScope } from "@/components/ui";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { db } from "@/db";
import { routes } from "@/lib/routes";
import { CATEGORY_LABELS, readUnsubscribeToken, type EmailCategory } from "@/lib/unsubscribe";
import { confirmUnsubscribe } from "@/server/actions/unsubscribe";
import { isSuppressed, unsubscribeSecret } from "@/server/email/suppressions";
import styles from "./unsubscribe.module.css";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ t?: string; done?: string; preview?: string }> };

/**
 * Where the "Unsubscribe" link in reminder, your-day and digest emails lands.
 * It asks before switching anything off, because inbox link scanners open
 * every link (the inbox's own one-click button POSTs to /api/unsubscribe).
 */
export default async function UnsubscribePage({ searchParams }: Props) {
  const { t, done, preview } = await searchParams;
  const isPreview = preview === "1" && process.env.NODE_ENV !== "production";
  const parsed = isPreview
    ? { email: "you@email.com", category: "reminders" as EmailCategory }
    : readUnsubscribeToken(t, unsubscribeSecret());
  const finished = Boolean(parsed && done === "1" && (await isSuppressed(db, parsed.email, parsed.category)));

  return (
    <ThemeScope theme={BIRTHDAY_BOARD_TYPE.settings.defaultTheme} paint>
      <SiteHeader />
      <main className={styles.main}>
        <Surface radius="hero" elevation="hero" padding="none" className={styles.card}>
          {!parsed ? (
            <>
              <Kicker size="md">Unsubscribe</Kicker>
              <h1 className={styles.h1}>This link doesn’t work.</h1>
              <p className={styles.body}>
                It may have been cut off when it was copied. Open the Unsubscribe link from the email again.
              </p>
              <Button href={routes.home} variant="paper" size="lg">
                Go to mybday.lol
              </Button>
            </>
          ) : finished ? (
            <>
              <Kicker size="md">Done</Kicker>
              <h1 className={styles.h1}>You’re unsubscribed.</h1>
              <p className={styles.body}>
                <strong>{parsed.email}</strong> won’t get {CATEGORY_LABELS[parsed.category]} any more. Receipts and
                outbid alerts still arrive.
              </p>
              <Button href={routes.home} variant="ink" size="lg">
                Back to mybday.lol
              </Button>
            </>
          ) : (
            <>
              <Kicker size="md">Unsubscribe</Kicker>
              <h1 className={styles.h1}>Stop {CATEGORY_LABELS[parsed.category]}?</h1>
              <p className={styles.body}>
                We’ll stop sending them to <strong>{parsed.email}</strong>.
              </p>
              <form action={confirmUnsubscribe} className={styles.actions}>
                <input type="hidden" name="t" value={t ?? ""} />
                <Button type="submit" variant="ink" size="lg" disabled={isPreview}>
                  Unsubscribe
                </Button>
                <Button href={routes.home} variant="text" size="lg">
                  Keep them coming
                </Button>
              </form>
            </>
          )}
        </Surface>
      </main>
      <SiteFooter />
    </ThemeScope>
  );
}
