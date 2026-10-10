"use client";

import { DropdownMenu } from "radix-ui";
import { useShare } from "@/components/share/useShare";
import { Icon, IconButton } from "@/components/ui";
import { facebookShareUrl, smsShareUrl } from "@/lib/share";
import styles from "./date.module.css";
import { useHoverMenu } from "./useHoverMenu";

type Props = {
  /** The link to share (the person's own link). */
  url: string;
  /** "It's Jess's birthday on mybday.lol" */
  message: string;
  name: string;
};

/**
 * The square share button on each card (handoff v2): a menu with Share…,
 * Facebook, Text and Copy link. Opens on hover with a mouse, on tap on touch,
 * and closes on an outside click or Escape.
 */
export function ShareMenu({ url, message, name }: Props) {
  const { open, setOpen, triggerProps, contentProps } = useHoverMenu();
  const { copied, copy, share } = useShare();

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenu.Trigger asChild>
        <IconButton icon="upload" label={`Share ${name}'s birthday`} className={styles.share} {...triggerProps} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className={styles.shareMenu}
          {...contentProps}
        >
          <DropdownMenu.Item className={`${styles.shareOption} lift`} onSelect={() => void share(url, message)}>
            <Icon name="share" size={16} />
            Share…
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={`${styles.shareOption} lift`}>
            <a href={facebookShareUrl(url)} target="_blank" rel="noopener noreferrer">
              <Icon name="facebook" size={16} />
              Facebook
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={`${styles.shareOption} lift`}>
            <a href={smsShareUrl(message, url)}>
              <Icon name="text" size={16} />
              Text
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={`${styles.shareOption} lift`}
            // Keep the menu open long enough to show "Copied!".
            onSelect={(event) => {
              event.preventDefault();
              void copy(url);
            }}
          >
            <Icon name={copied ? "check" : "link"} size={16} />
            <span aria-live="polite">{copied ? "Copied!" : "Copy link"}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
