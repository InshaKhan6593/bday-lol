"use client";

import { Button, ColorIcon, Icon } from "@/components/ui";
import { cx } from "@/lib/cx";
import { facebookShareUrl, smsShareUrl } from "@/lib/share";
import styles from "./ShareButtons.module.css";
import { useCopy } from "./useCopy";
import { useShare } from "./useShare";

type Props = {
  url: string;
  /** Message that goes with the link, e.g. "It's Jess's birthday on mybday.lol". */
  message: string;
  /** Success page: taller buttons, Share and Facebook in ink. */
  large?: boolean;
  className?: string;
};

/** The 2×2 share grid: phone share sheet, Facebook, text message, copy link. */
export function ShareButtons({ url, message, large, className }: Props) {
  const { copied, copy, share } = useShare();
  const lead = large ? "ink" : "paper";

  return (
    <div className={cx(styles.grid, large && styles.large, className)}>
      <Button variant={lead} onClick={() => share(url, message)} iconStart={<ColorIcon name="share" tile={large} />}>
        Share
      </Button>
      <Button
        variant={lead}
        external
        href={facebookShareUrl(url)}
        target="_blank"
        rel="noopener noreferrer"
        iconStart={<ColorIcon name="facebook" tile={large} />}
      >
        Facebook
      </Button>
      <Button variant="paper" external href={smsShareUrl(message, url)} iconStart={<ColorIcon name="text" />}>
        Text
      </Button>
      <Button
        variant="paper"
        onClick={() => copy(url)}
        iconStart={copied ? <Icon name="check" size={24} /> : <ColorIcon name="link" />}
      >
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
        iconStart={<ColorIcon name="text" tile />}
      >
        Text them the link
      </Button>
      <Button
        variant="paper"
        size="lg"
        onClick={() => copy(url)}
        className={styles.inviteCopy}
        iconStart={copied ? <Icon name="check" size={24} /> : <ColorIcon name="link" />}
      >
        <span aria-live="polite">{copied ? "Copied!" : "Copy link"}</span>
      </Button>
    </div>
  );
}
