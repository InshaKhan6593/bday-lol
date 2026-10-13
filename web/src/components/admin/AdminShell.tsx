"use client";

import { ChartBarIcon, FileTextIcon, KeyIcon, ListBulletsIcon, PlusCircleIcon, SignOutIcon, StarIcon } from "@phosphor-icons/react";
import type { Route } from "next";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useRef } from "react";
import { routes } from "@/lib/routes";
import { adminSignOut } from "@/server/actions/admin";
import classes from "./admin.module.css";

const NAV: Array<{ href: Route; label: string; icon: typeof StarIcon }> = [
  { href: routes.admin.listings, label: "Listings", icon: ListBulletsIcon },
  { href: routes.admin.comped, label: "Add comped", icon: PlusCircleIcon },
  { href: routes.admin.famous, label: "Famous people", icon: StarIcon },
  { href: routes.admin.pages, label: "Pages", icon: FileTextIcon },
  { href: routes.admin.revenue, label: "Revenue", icon: ChartBarIcon },
  { href: routes.admin.account, label: "Account", icon: KeyIcon },
];

/** How long the screens fetched ahead count as current. */
const FRESH_FOR_MS = 20_000;

/** The screens that show what visitors do, and how often they look again while the tab is in view. */
const WATCHED_SCREENS: string[] = [routes.admin.listings, routes.admin.revenue];
const WATCH_EVERY_MS = 120_000;

/**
 * A thin bar across the top while the server is answering. Most clicks no longer wait for it (the
 * listings are handled in the browser and changes are drawn at once), so the bar is what shows that
 * the server is still confirming one.
 */
export function LoadingBar({ active }: { active: boolean }) {
  return <div className={classes.loadingBar} data-active={active || undefined} role="progressbar" aria-hidden={!active} aria-label="Loading" />;
}

/** Inside a menu link: the bar shows while that link's screen is on its way. */
function LinkPending() {
  return <LoadingBar active={useLinkStatus().pending} />;
}

/** The admin's frame: the black menu on the left, the screen on the right. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // The menu's screens are fetched ahead (`prefetch` below), so a click shows one at once. What was
  // fetched can be a few minutes old, so a screen reached after a while quietly asks again: it is on
  // screen immediately and correct a moment later. Asking again throws the other screens' copies
  // away too, so it is skipped while everything was fetched moments ago (clicking through the menu).
  const arrivedAt = useRef(pathname);
  const fetchedAt = useRef(0);
  useEffect(() => {
    if (fetchedAt.current === 0) fetchedAt.current = Date.now();
    if (arrivedAt.current === pathname) return;
    arrivedAt.current = pathname;
    if (Date.now() - fetchedAt.current < FRESH_FOR_MS) return;
    fetchedAt.current = Date.now();
    startTransition(() => router.refresh());
  }, [pathname, router]);

  // The listings and the revenue change without the admin doing anything (a claim, a boost), and
  // these screens no longer ask the server on every click. So they ask by themselves: when the tab
  // is looked at again, and every couple of minutes while it is. Screens with a form being typed in
  // are left alone.
  useEffect(() => {
    if (!WATCHED_SCREENS.includes(pathname)) return;
    const sync = () => {
      if (document.visibilityState !== "visible" || Date.now() - fetchedAt.current < FRESH_FOR_MS) return;
      fetchedAt.current = Date.now();
      startTransition(() => router.refresh());
    };
    const timer = window.setInterval(sync, WATCH_EVERY_MS);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, [pathname, router]);
  return (
    <div className={classes.shell}>
      <nav className={classes.nav} aria-label="Admin">
        <Link href={routes.home} prefetch={false} className={classes.brand}>
          mybday.lol
          <span className={classes.brandSub}>Admin</span>
        </Link>
        {NAV.map(({ href, label, icon: NavIcon }) => (
          <Link key={href} href={href} prefetch className={classes.navLink} aria-current={pathname === href ? "page" : undefined}>
            <NavIcon size={20} weight="bold" aria-hidden />
            {label}
            <LinkPending />
          </Link>
        ))}
        <span className={classes.navSpacer} />
        <form action={adminSignOut}>
          <button type="submit" className={classes.navLink}>
            <SignOutIcon size={20} weight="bold" aria-hidden />
            Sign out
          </button>
        </form>
      </nav>
      <main className={classes.main}>{children}</main>
    </div>
  );
}

/** A screen's heading, with room for a few facts next to the title (`aside`) and for its main button. */
export function PageHead({ title, lead, aside, children }: { title: string; lead?: React.ReactNode; aside?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className={classes.pageHead}>
      <div>
        <div className={classes.titleRow}>
          <h1 className={classes.h1}>{title}</h1>
          {aside}
        </div>
        {lead && <p className={classes.lead}>{lead}</p>}
      </div>
      {children}
    </div>
  );
}
