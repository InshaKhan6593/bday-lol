"use client";

import { DropdownMenu } from "radix-ui";
import { Button, Icon, ThemeScope } from "@/components/ui";
import type { ThemeKey } from "@/config/themes";
import type { GiftLink } from "@/db/schema";
import { GIFT_SERVICES } from "@/lib/gifts";
import styles from "./date.module.css";
import { useHoverMenu } from "./useHoverMenu";
import { useMediaQuery } from "./useMediaQuery";

type Props = {
  links: GiftLink[];
  /** The page's theme: the menu is portalled, so it needs the accent passed on. */
  theme: ThemeKey;
};

/**
 * "Send a gift ▾" on today's board. With a mouse it opens on hover (or click);
 * on touch a tap toggles it. Each option opens the person's own gift link.
 * Desktop aligns the menu right, mobile left (mockup). The ▾ points up only
 * while the menu is open.
 */
export function GiftMenu({ links, theme }: Props) {
  const { open, setOpen, triggerProps, contentProps } = useHoverMenu();
  const mobile = useMediaQuery("(max-width: 640px)");

  return (
    <div className={styles.giftWrap}>
      <DropdownMenu.Root open={open} onOpenChange={setOpen} modal={false}>
        <DropdownMenu.Trigger asChild>
          <Button
            className={styles.giftButton}
            iconEnd={<Icon name="chevronDown" size={16} className={styles.giftChevron} />}
            {...triggerProps}
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
              {...contentProps}
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
