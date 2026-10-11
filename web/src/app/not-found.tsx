import type { Metadata } from "next";
import styles from "@/components/site/NotFound.module.css";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button, Kicker, ThemeScope } from "@/components/ui";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Page not found" };

/**
 * Any URL that isn't a page (/february-30, /nope). Not in the mockup: built from the legal pages' head and
 * the site's buttons. Rendered on the server so the message and links are in the HTML (claude-seo seo-technical).
 */
export default function NotFound() {
  return (
    <ThemeScope theme={BIRTHDAY_BOARD_TYPE.settings.defaultTheme} paint>
      <SiteHeader />
      <main className={styles.main}>
        <Kicker size="md">Page not found</Kicker>
        <h1 className={styles.h1}>That’s not on the calendar.</h1>
        <p className={styles.text}>
          This page doesn’t exist, or the link is misspelled. Every birthday has a board, from January 1 to December 31.
        </p>
        <div className={styles.actions}>
          <Button href={routes.home} variant="ink" size="lg">
            Today’s birthday
          </Button>
          <Button href={routes.howItWorks} variant="paper" size="lg">
            How it works
          </Button>
        </div>
      </main>
      <SiteFooter />
    </ThemeScope>
  );
}
