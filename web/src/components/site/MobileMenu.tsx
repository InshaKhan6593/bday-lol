"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui";
import { cx } from "@/lib/cx";
import styles from "./SiteHeader.module.css";

/**
 * Mobile menu (handoff v2): the ☰ button in the header opens a panel right
 * under it that pushes the page down. The button turns into ✕ while open, the
 * current page is highlighted, and a black "Claim your birthday" button closes
 * the list. The button and the panel sit in different places in the header, so
 * they share their open state through context.
 */

type MenuState = { open: boolean; setOpen: (open: boolean) => void; panelId: string };
const MenuContext = createContext<MenuState | null>(null);

function useMenu(): MenuState {
  const menu = useContext(MenuContext);
  if (!menu) throw new Error("Mobile menu parts must be inside <MobileMenuProvider>.");
  return menu;
}

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Remembers the page it was opened on, so navigating anywhere closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (next: boolean) => setOpenOn(next ? pathname : null);
  const panelId = useId();

  // Escape closes it too.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return <MenuContext.Provider value={{ open, setOpen, panelId }}>{children}</MenuContext.Provider>;
}

export function MobileMenuButton() {
  const { open, setOpen, panelId } = useMenu();
  return (
    <button
      type="button"
      className={cx(styles.menuButton, open && styles.menuButtonOpen)}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      aria-controls={panelId}
      onClick={() => setOpen(!open)}
    >
      <Icon name={open ? "close" : "menu"} size={20} />
    </button>
  );
}

export type MenuItem = { key: string; href: Route; label: string };

export function MobileMenuPanel({ items, current, claimHref }: { items: MenuItem[]; current?: string; claimHref: Route }) {
  const { open, setOpen, panelId } = useMenu();
  if (!open) return null;
  return (
    <nav id={panelId} aria-label="Site menu" className={styles.menuPanel}>
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.key === current ? "page" : undefined}
          className={styles.menuItem}
          onClick={() => setOpen(false)}
        >
          {item.label}
          <Icon name="chevronRight" size={16} />
        </Link>
      ))}
      <Link href={claimHref} className={styles.menuClaim} onClick={() => setOpen(false)}>
        Claim your birthday
      </Link>
    </nav>
  );
}
