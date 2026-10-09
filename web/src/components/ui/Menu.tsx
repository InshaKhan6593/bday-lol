"use client";

import Link from "next/link";
import type { Route } from "next";
import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Menu.module.css";

type Props = {
  /** The button that opens the menu (rendered as the Radix trigger). */
  trigger: ReactNode;
  items: Array<{ href: Route; label: string }>;
  align?: "start" | "end";
  className?: string;
};

/**
 * Dropdown menu of links in the design language: white panel, ink outline and
 * a hard shadow, same as the Select list. Built on Radix for keyboard, focus
 * and touch support.
 */
export function Menu({ trigger, items, align = "end", className }: Props) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Content align={align} sideOffset={8} collisionPadding={16} className={cx(styles.menu, className)}>
        {items.map((item) => (
          <DropdownMenu.Item key={item.href} asChild className={styles.item}>
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
