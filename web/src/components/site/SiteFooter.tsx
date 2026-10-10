import Link from "next/link";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { MONTHS, MONTHS_SHORT, zonedDate } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { routes } from "@/lib/routes";
import styles from "./SiteFooter.module.css";

/**
 * Every page: "© 2026 mybday.lol" on the left, FAQ · Terms · Privacy on the right (handoff v2 §11).
 * Above it, links to the 12 month pages: the month pages link every date, so all 366 date
 * pages are within three clicks of anywhere (claude-seo seo-technical: crawl depth).
 */
export function SiteFooter() {
  const year = zonedDate(now(), BIRTHDAY_BOARD_TYPE.settings.timezone).year;
  return (
    <footer className={styles.footer}>
      <nav aria-label="Birthdays by month" className={styles.months}>
        <span className={styles.monthsLabel}>Birthdays by month</span>
        {MONTHS.map((name, i) => (
          <Link key={name} href={routes.month(i + 1)} aria-label={`${name} birthdays`}>
            {MONTHS_SHORT[i]}
          </Link>
        ))}
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
