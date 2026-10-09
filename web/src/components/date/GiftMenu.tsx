"use client";

import { DropdownMenu } from "radix-ui";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Button, Icon, ThemeScope } from "@/components/ui";
import type { ThemeKey } from "@/config/themes";
import type { GiftLink } from "@/db/schema";
import { GIFT_SERVICES } from "@/lib/gifts";
import styles from "./date.module.css";
import { useMediaQuery } from "./useMediaQuery";

/** Time to cross the gap between the button and the menu before it closes. */
const HOVER_CLOSE_MS = 120;

type Props = {
  links: GiftLink[];
  /** The page's theme: the menu is portalled, so it needs the accent passed on. */
  theme: ThemeKey;
};

/**
 * "Send a gift ▾" on today's list. With a mouse it opens on hover (or click);
 * on touch a tap toggles it. Each option opens the person's own gift link.
 * Desktop aligns the menu right, mobile left (mockup).
 */
export function GiftMenu({ links, theme }: Props) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mobile = useMediaQuery("(max-width: 640px)");

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const hover = (next: boolean) => (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    clearTimeout(closeTimer.current);
    if (next) setOpen(true);
    else closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_MS);
  };

  return (
    <div className={styles.giftWrap}>
      <DropdownMenu.Root open={open} onOpenChange={setOpen} modal={false}>
        <DropdownMenu.Trigger asChild>
          <Button
            className={styles.giftButton}
            iconEnd={<Icon name="chevronDown" size={16} className={styles.giftChevron} />}
            onPointerEnter={hover(true)}
            onPointerLeave={hover(false)}
            // Hover already opened it: a click must not toggle it shut again.
            onPointerDown={(event) => {
              if (event.pointerType === "mouse" && open) event.preventDefault();
            }}
          >
            Send a gift
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <ThemeScope theme={theme}>
            <DropdownMenu.Content
              align={mobile ? "start" : "end"}
              sideOffset={8}
              collisionPadding={16}
              className={styles.giftMenu}
              onPointerEnter={hover(true)}
              onPointerLeave={hover(false)}
            >
              {links.map((link) => (
                <DropdownMenu.Item key={link.url} asChild className={`${styles.giftOption} lift`}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {GIFT_SERVICES[link.service].label}
                    <Icon name="arrowUpRight" size={16} />
                  </a>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </ThemeScope>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
