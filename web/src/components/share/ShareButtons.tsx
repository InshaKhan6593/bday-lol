"use client";

import { Button, Icon } from "@/components/ui";
import { cx } from "@/lib/cx";
import { facebookShareUrl, smsShareUrl } from "@/lib/share";
import styles from "./ShareButtons.module.css";
import { useCopy } from "./useCopy";

type Props = {
  url: string;
  /** Message that goes with the link, e.g. "It's Jess's birthday on bday.lol". */
  message: string;
  className?: string;
};

/** The 2×2 share grid: phone share sheet, Facebook, text message, copy link. */
export function ShareButtons({ url, message, className }: Props) {
  const { copied, copy } = useCopy();

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: message, text: message, url });
        return;
      } catch (error) {
        if ((error as DOMException).name === "AbortError") return;
      }
    }
    await copy(url);
  }

  return (
    <div className={cx(styles.grid, className)}>
      <Button variant="paper" onClick={share} iconStart={<Icon name="share" size={20} />}>
        Share
      </Button>
      <Button
        variant="paper"
        external
        href={facebookShareUrl(url)}
        target="_blank"
        rel="noopener noreferrer"
        iconStart={<Icon name="facebook" size={20} />}
      >
        Facebook
      </Button>
      <Button variant="paper" external href={smsShareUrl(message, url)} iconStart={<Icon name="text" size={20} />}>
        Text
      </Button>
      <Button variant="paper" onClick={() => copy(url)} iconStart={<Icon name="link" size={20} />}>
        <span aria-live="polite">{copied ? "Copied!" : "Copy link"}</span>
      </Button>
    </div>
  );
}

/** "Text them the link" + "Copy link", for an empty date. */
export function InviteButtons({ url, message, className }: Props) {
  const { copied, copy } = useCopy();
  return (
    <div className={cx(styles.invite, className)}>
      <Button
        external
        href={smsShareUrl(message, url)}
        size="lg"
        className={styles.inviteText}
        iconStart={<Icon name="text" size={20} />}
      >
        Text them the link
      </Button>
      <Button
        variant="paper"
        size="lg"
        onClick={() => copy(url)}
        className={styles.inviteCopy}
        iconStart={<Icon name="link" size={20} />}
      >
        <span aria-live="polite">{copied ? "Copied!" : "Copy link"}</span>
      </Button>
    </div>
  );
}
