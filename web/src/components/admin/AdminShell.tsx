"use client";

import { ChartBarIcon, FileTextIcon, ListBulletsIcon, PlusCircleIcon, SignOutIcon, StarIcon } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
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
];

/** The admin's frame: the black menu on the left, the screen on the right. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className={classes.shell}>
      <nav className={classes.nav} aria-label="Admin">
        <Link href={routes.home} className={classes.brand}>
          mybday.lol
          <span className={classes.brandSub}>Admin</span>
        </Link>
        {NAV.map(({ href, label, icon: NavIcon }) => (
          <Link key={href} href={href} className={classes.navLink} aria-current={pathname === href ? "page" : undefined}>
            <NavIcon size={20} weight="bold" aria-hidden />
            {label}
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

/** A screen's heading, with room for its main button. */
export function PageHead({ title, lead, children }: { title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <div className={classes.pageHead}>
      <div>
        <h1 className={classes.h1}>{title}</h1>
        {lead && <p className={classes.lead}>{lead}</p>}
      </div>
      {children}
    </div>
  );
}
