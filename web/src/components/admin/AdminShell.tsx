"use client";

import { ChartBarIcon, FileTextIcon, KeyIcon, ListBulletsIcon, PlusCircleIcon, SignOutIcon, StarIcon } from "@phosphor-icons/react";
import type { Route } from "next";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
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

/**
 * A thin bar across the top while the server is answering. Every admin click is a trip to the server,
 * so something has to move the moment it starts.
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
  return (
    <div className={classes.shell}>
      <nav className={classes.nav} aria-label="Admin">
        <Link href={routes.home} prefetch={false} className={classes.brand}>
          mybday.lol
          <span className={classes.brandSub}>Admin</span>
        </Link>
        {NAV.map(({ href, label, icon: NavIcon }) => (
          <Link key={href} href={href} className={classes.navLink} aria-current={pathname === href ? "page" : undefined}>
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
