"use client";

import type { Route } from "next";
import { IconButton, Menu } from "@/components/ui";

/** Mobile hamburger: a dropdown with the page links (decided, 07 B12). */
export function MobileMenu({ items }: { items: Array<{ href: Route; label: string }> }) {
  return <Menu items={items} trigger={<IconButton icon="menu" label="Menu" size="md" iconSize={20} />} />;
}
