"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { BoostDialog } from "@/components/boost/BoostDialog";
import { InviteButtons } from "@/components/share/ShareButtons";
import { Button, Icon, IconButton, Surface } from "@/components/ui";
import type { BoardTypeSettings } from "@/config/board-types";
import type { ThemeKey } from "@/config/themes";
import { formatLong, formatLongNb, type MonthDay } from "@/lib/birthday";
import { boostBoxTop } from "@/lib/boost";
import { ctaCopy, filterByName, searchCountText } from "@/lib/date-page";
import { routes } from "@/lib/routes";
import type { DateEntry } from "@/server/date-page";
import styles from "./date.module.css";
import { EntryRow } from "./EntryRow";

type Props = {
  md: MonthDay;
  isToday: boolean;
  giftsOpenLabel: string;
  entries: DateEntry[];
  theme: ThemeKey;
  shareUrl: string;
  settings: Pick<
    BoardTypeSettings,
    "minOpenBidCents" | "minStepCents" | "minBoostCents" | "boostChipsCents" | "defaultBoostCents"
  >;
};

/**
 * The interactive part of the date page: the claim bar, name search and the
 * ranked list. Tapping a card switches the bar to "Claim #N"; the ▲ pill opens
 * the Boost box. Keyed by date, so search and picks reset when the date changes.
 */
export function DateBoard({ md, isToday, giftsOpenLabel, entries, theme, shareUrl, settings }: Props) {
  const [pickedRank, setPickedRank] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [boosting, setBoosting] = useState<{ entry: DateEntry; top: number } | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const label = formatLongNb(md);
  // Picking #1 just means "go for the top", same as no pick.
  const picked = pickedRank && pickedRank > 1 ? entries[pickedRank - 1] : undefined;
  const cta = ctaCopy({
    md,
    isToday,
    topTotalCents: entries[0]?.totalCents ?? null,
    picked: picked ? { rank: picked.rank, totalCents: picked.totalCents } : null,
    rules: settings,
  });
  const q = query.trim();
  const shown = filterByName(entries, query);

  function pick(rank: number) {
    setPickedRank(rank);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function openBoost(entry: DateEntry, button: HTMLButtonElement) {
    opener.current = button;
    setBoosting({ entry, top: boostBoxTop(button.getBoundingClientRect().top, window.innerHeight) });
  }

  return (
    <>
      <Surface tone="ink" radius="card" padding="none" className={styles.cta}>
        <div className={styles.ctaText}>
          <p className={styles.ctaTitle}>{cta.title}</p>
          <p className={styles.ctaSub}>{cta.sub}</p>
          {cta.rank && (
            <button type="button" className={styles.goTop} onClick={() => setPickedRank(null)}>
              Or go for #1
            </button>
          )}
        </div>
        <Button
          href={routes.claim(md, cta.rank ?? undefined)}
          variant="accent"
          size="xl"
          shape="large"
          className={styles.ctaButton}
        >
          {cta.button}
        </Button>
      </Surface>

      {entries.length === 0 ? (
        <Surface outline="dashed" radius="card" padding="none" className={styles.empty}>
          Nobody has claimed {label} yet. The highest bid gets the homepage.
        </Surface>
      ) : (
        <div className={styles.searchWrap}>
          <label className={styles.search}>
            <Icon name="search" size={20} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search names"
              placeholder={`Search names on ${formatLong(md)}`}
              autoComplete="off"
              enterKeyHint="search"
              className={styles.searchInput}
            />
            {q && (
              <IconButton
                icon="close"
                label="Clear search"
                size="sm"
                tone="muted"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
              />
            )}
          </label>
          {q && shown.length > 0 && (
            <p className={styles.count} aria-live="polite">
              {searchCountText(shown.length, entries.length)}
            </p>
          )}
        </div>
      )}

      {q && shown.length === 0 && (
        <Surface outline="dashed" radius="card" padding="none" className={styles.noMatch}>
          <p className={styles.noMatchTitle}>
            No “{q}” on {label} yet
          </p>
          <p className={styles.noMatchText}>Know it’s their birthday? Send them the link so they can join.</p>
          <InviteButtons
            url={shareUrl}
            message={`Is your birthday ${formatLong(md)}? Claim it on bday.lol`}
            className={styles.noMatchActions}
          />
          <Link href={routes.claim(md)} className={styles.claimForThem}>
            Or claim it for them
          </Link>
        </Surface>
      )}

      {shown.length > 0 && (
        <ol className={styles.list} aria-label={`Everyone celebrating ${formatLong(md)}`}>
          {shown.map((entry) => (
            <EntryRow
              key={entry.publicId}
              entry={entry}
              isToday={isToday}
              giftsOpenLabel={giftsOpenLabel}
              theme={theme}
              shareUrl={shareUrl}
              rules={settings}
              onPick={() => pick(entry.rank)}
              onBoost={(button) => openBoost(entry, button)}
            />
          ))}
        </ol>
      )}

      <BoostDialog
        target={boosting?.entry ?? null}
        top={boosting?.top ?? 0}
        onClose={() => {
          setBoosting(null);
          // Back to the pill that opened the box (keyboard users keep their place).
          requestAnimationFrame(() => opener.current?.focus());
        }}
        otherTotalsCents={entries.filter((e) => e.publicId !== boosting?.entry.publicId).map((e) => e.totalCents)}
        topTotalCents={entries[0]?.totalCents ?? 0}
        dateLabel={formatLong(md)}
        theme={theme}
        settings={settings}
      />
    </>
  );
}
