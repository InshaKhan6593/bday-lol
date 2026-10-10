import type { Route } from "next";
import Link from "next/link";
import { Button, IconButton } from "@/components/ui";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { zonedDate } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { cx } from "@/lib/cx";
import { routes } from "@/lib/routes";
import { MobileMenuButton, MobileMenuPanel, MobileMenuProvider, type MenuItem } from "./MobileMenu";
import styles from "./SiteHeader.module.css";

type NavKey = "find" | "how" | "claim";
type PageKey = "home" | "find" | "how";

type Props = {
  /** Each page leaves out the link to itself (Find page: no "find"; Claim and Success: no "claim"). */
  omit?: NavKey[];
  /** The page this is, highlighted in the mobile menu. */
  current?: PageKey;
  /**
   * Mobile layout. "menu" = logo + "Claim yours" + menu button. "back" = a round
   * back button and a centered logo (Claim and Success boards). "plain" = logo +
   * "Claim yours" (Terms and Privacy).
   */
  mobile?: "menu" | "back" | "plain";
  /** Where the mobile back button goes (default: the homepage, "Back to today"). */
  back?: { href: Route; label: string };
};

/**
 * Global header. Desktop: logo + text links + "Claim your birthday" pill.
 * Mobile: logo + "Claim yours" pill + menu button. The logo always goes to the
 * top of the homepage.
 */
export function SiteHeader({
  omit = [],
  current,
  mobile = "menu",
  back = { href: routes.home, label: "Back to today" },
}: Props) {
  const today = zonedDate(now(), BIRTHDAY_BOARD_TYPE.settings.timezone);
  const findHref = routes.date(today);
  const links = [
    { key: "find" as const, href: findHref, label: "Find your birthday" },
    { key: "how" as const, href: routes.howItWorks, label: "How it works" },
  ].filter((link) => !omit.includes(link.key));
  const showClaim = !omit.includes("claim");
  const menuItems: MenuItem[] = [
    { key: "home", href: routes.home, label: "Today’s birthday" },
    { key: "find", href: findHref, label: "Find your birthday" },
    { key: "how", href: routes.howItWorks, label: "How it works & FAQ" },
  ];

  return (
    <MobileMenuProvider>
    <header className={cx(styles.header, mobile === "back" && styles.backMode)}>
      {mobile === "back" && (
        <IconButton href={back.href} icon="chevronLeft" label={back.label} size="md" iconSize={20} className={styles.back} />
      )}
      <Link href={routes.home} className={styles.logo}>
        mybday.lol
      </Link>

      <nav aria-label="Main" className={styles.desktopNav}>
        {links.map((link) => (
          <Link key={link.key} href={link.href} className={styles.navLink}>
            {link.label}
          </Link>
        ))}
        {showClaim && (
          <Button href={routes.claim()} shape="pill" size="sm" className={styles.claimPill}>
            Claim your birthday
          </Button>
        )}
      </nav>

      {mobile === "back" && <span aria-hidden="true" className={styles.backSpacer} />}

      <div className={styles.mobileNav}>
        {showClaim && (
          <Button href={routes.claim()} shape="pill" size="sm" className={styles.claimPillMobile}>
            Claim yours
          </Button>
        )}
        {mobile === "menu" && <MobileMenuButton />}
      </div>
    </header>
    {mobile === "menu" && <MobileMenuPanel items={menuItems} current={current} claimHref={routes.claim()} />}
    </MobileMenuProvider>
  );
}
