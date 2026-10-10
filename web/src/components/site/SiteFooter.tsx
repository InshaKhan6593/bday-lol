import Link from "next/link";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { zonedDate } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { routes } from "@/lib/routes";
import styles from "./SiteFooter.module.css";

/** Every page: "© 2026 mybday.lol" on the left, FAQ · Terms · Privacy on the right (handoff v2 §11). */
export function SiteFooter() {
  const year = zonedDate(now(), BIRTHDAY_BOARD_TYPE.settings.timezone).year;
  return (
    <footer className={styles.footer}>
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
