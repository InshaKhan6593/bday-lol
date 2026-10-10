"use client";

import type { Route } from "next";
import Link from "next/link";
import { Avatar, Badge, Button, Icon } from "@/components/ui";
import type { BoardTypeSettings } from "@/config/board-types";
import { getTheme, type ThemeKey } from "@/config/themes";
import { cx } from "@/lib/cx";
import { outrankText } from "@/lib/date-page";
import { formatUsd } from "@/lib/money";
import { firstName } from "@/lib/people";
import { birthdayShareText } from "@/lib/share";
import type { DateEntry } from "@/server/date-page";
import styles from "./date.module.css";
import { GiftMenu } from "./GiftMenu";
import { ShareMenu } from "./ShareMenu";

type Props = {
  entry: DateEntry;
  isToday: boolean;
  /** "Gifts open Oct 7" for any other day. */
  giftsOpenLabel: string;
  /** The page theme (the viewed date's #1), used by the badge, tooltips and gift menu. */
  theme: ThemeKey;
  shareUrl: string;
  rules: Pick<BoardTypeSettings, "minOpenBidCents" | "minStepCents">;
  /** Phones: this card was tapped, so it's outlined and shows its "Outrank…" button. */
  picked: boolean;
  /** Arrived on this person's personal link: highlighted, scrolled to, and no outrank popup. */
  focused?: boolean;
  /** Claim page with the date and the rank outranking them lands at. */
  claimHref: Route;
  onPick: () => void;
  onBoost: (button: HTMLButtonElement) => void;
};

/**
 * One person on the board. Picking the card means "Outrank them" (desktop: the
 * hover popup and the black bar; phones: an outline and an in-card button); the
 * ▲ total pill boosts them; the gift and share controls never pick the card.
 */
export function EntryRow({
  entry,
  isToday,
  giftsOpenLabel,
  theme,
  shareUrl,
  rules,
  picked,
  focused = false,
  claimHref,
  onPick,
  onBoost,
}: Props) {
  const top = entry.rank === 1;
  const claimText = outrankText(entry.name, entry.totalCents, rules);

  return (
    <li
      className={cx(styles.row, top && styles.rowTop, picked && styles.rowPicked, focused && styles.rowFocused)}
      data-scroll-target={focused ? "" : undefined}
    >
      {!focused && (
        <>
          <button
            type="button"
            className={styles.claim}
            onClick={onPick}
            aria-label={`${entry.name}, #${entry.rank}. ${claimText}`}
            aria-pressed={picked}
          />
          <span className={styles.tip} aria-hidden="true">
            {claimText}
          </span>
        </>
      )}

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
        <ShareMenu url={shareUrl} message={birthdayShareText(firstName(entry.name))} name={entry.name} theme={theme} />
      </div>

      {picked && (
        <Link href={claimHref} className={styles.outrankHere}>
          {claimText}
          <Icon name="arrowRight" size={16} />
        </Link>
      )}
    </li>
  );
}
