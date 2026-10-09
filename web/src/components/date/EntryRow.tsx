"use client";

import { useShare } from "@/components/share/useShare";
import { Avatar, Badge, Button, Icon, IconButton } from "@/components/ui";
import type { BoardTypeSettings } from "@/config/board-types";
import { getTheme, type ThemeKey } from "@/config/themes";
import { cx } from "@/lib/cx";
import { claimRankText } from "@/lib/date-page";
import { formatUsd } from "@/lib/money";
import { firstName } from "@/lib/people";
import { birthdayShareText } from "@/lib/share";
import type { DateEntry } from "@/server/date-page";
import styles from "./date.module.css";
import { GiftMenu } from "./GiftMenu";

type Props = {
  entry: DateEntry;
  isToday: boolean;
  /** "Gifts open Oct 7" for any other day. */
  giftsOpenLabel: string;
  /** The page theme (the viewed date's #1), used by the badge, tooltips and gift menu. */
  theme: ThemeKey;
  shareUrl: string;
  rules: Pick<BoardTypeSettings, "minOpenBidCents" | "minStepCents">;
  onPick: () => void;
  onBoost: (button: HTMLButtonElement) => void;
};

/**
 * One person on the list. Tapping the card means "Claim this rank"; the
 * ▲ total pill boosts them; the gift and share controls never trigger a claim.
 */
export function EntryRow({ entry, isToday, giftsOpenLabel, theme, shareUrl, rules, onPick, onBoost }: Props) {
  const top = entry.rank === 1;
  const claimText = claimRankText(entry.totalCents, rules);

  return (
    <li className={cx(styles.row, top && styles.rowTop)}>
      <button
        type="button"
        className={styles.claim}
        onClick={onPick}
        aria-label={`${entry.name}, #${entry.rank}. ${claimText}`}
      />
      <span className={styles.tip} aria-hidden="true">
        {claimText}
      </span>

      <span className={styles.avatarWrap}>
        <span className={styles.rank} aria-hidden="true">
          <span className={styles.hash}>#</span>
          {entry.rank}
        </span>
        <Avatar
          name={entry.name}
          photoUrl={entry.photoUrl}
          color={getTheme(entry.theme).ground}
          className={styles.avatar}
        />
      </span>

      <div className={styles.text}>
        <div className={styles.nameLine}>
          <span className={cx(styles.name, !entry.bio && styles.nameOnly)}>{entry.name}</span>
          {top && <Badge className={styles.badge}>{isToday ? "On the homepage" : "Top bid"}</Badge>}
        </div>
        {entry.bio && <p className={styles.bio}>{entry.bio}</p>}
        {entry.held && <p className={styles.held}>{entry.held}</p>}
      </div>

      <span className={styles.boostWrap}>
        <Button
          variant="paper"
          shape="pill"
          hoverInvert
          className={styles.boostPill}
          iconStart={<Icon name="boost" size={16} />}
          aria-label={`Boost ${entry.name}, currently ${formatUsd(entry.totalCents)}`}
          onClick={(event) => onBoost(event.currentTarget)}
        >
          {formatUsd(entry.totalCents)}
        </Button>
        <span className={styles.tip} aria-hidden="true">
          Boost {firstName(entry.name)}
        </span>
      </span>

      <div className={styles.actions}>
        {isToday ? (
          entry.giftLinks.length > 0 && <GiftMenu links={entry.giftLinks} theme={theme} />
        ) : (
          <span className={styles.giftsOpen}>{giftsOpenLabel}</span>
        )}
        <RowShare url={shareUrl} name={entry.name} />
      </div>
    </li>
  );
}

/** Square share button: the phone's share sheet, or copy the date's link. */
function RowShare({ url, name }: { url: string; name: string }) {
  const { copied, share } = useShare();
  return (
    <IconButton
      icon={copied ? "check" : "upload"}
      label={copied ? "Link copied" : `Share ${name}'s birthday`}
      className={styles.share}
      onClick={() => share(url, birthdayShareText(firstName(name)))}
    />
  );
}
