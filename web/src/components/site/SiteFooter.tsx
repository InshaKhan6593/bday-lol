import Link from "next/link";
import { Kicker } from "@/components/ui";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { MONTHS, MONTHS_SHORT, zonedDate } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { cx } from "@/lib/cx";
import { routes } from "@/lib/routes";
import styles from "./SiteFooter.module.css";

type Props = {
  /** 1–12: the month the page is about (date and month pages), shown as the selected pill. */
  currentMonth?: number;
};

/**
 * Every page: "© 2026 mybday.lol" on the left, FAQ · Terms · Privacy on the right (handoff v2 §11).
 * Above it, links to the 12 month pages: the month pages link every date, so all 366 date
 * pages are within three clicks of anywhere (claude-seo seo-technical: crawl depth).
 */
export function SiteFooter({ currentMonth }: Props = {}) {
  const year = zonedDate(now(), BIRTHDAY_BOARD_TYPE.settings.timezone).year;
  return (
    <footer className={styles.footer}>
      <nav aria-labelledby="footer-months" className={styles.months}>
        <Kicker size="sm">
          <span id="footer-months">Birthdays by month</span>
        </Kicker>
        <ul className={styles.monthList}>
          {MONTHS.map((name, i) => {
            const current = currentMonth === i + 1;
            return (
              <li key={name}>
                <Link
                  href={routes.month(i + 1)}
                  aria-label={`${name} birthdays`}
                  aria-current={current ? "true" : undefined}
                  className={cx(styles.month, current && styles.monthCurrent, "lift")}
                >
                  {MONTHS_SHORT[i]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className={styles.copy}>
        © {year} mybday.lol
        {/* Streamline's free icons (CC BY 4.0) need a credit; a paid Streamline plan removes it. */}
        <a href="https://www.streamlinehq.com" target="_blank" rel="noopener noreferrer" className={styles.credit}>
          Icons by Streamline
        </a>
      </div>
      <nav aria-label="Footer" className={styles.links}>
        <Link href={routes.howItWorks}>FAQ</Link>
        <Link href={routes.terms}>Terms</Link>
        <Link href={routes.privacy}>Privacy</Link>
      </nav>
    </footer>
  );
}
