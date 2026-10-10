"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { BoostDialog } from "@/components/boost/BoostDialog";
import { InviteButtons } from "@/components/share/ShareButtons";
import { Button, Icon, IconButton, Surface } from "@/components/ui";
import type { BoardTypeSettings } from "@/config/board-types";
import type { ThemeKey } from "@/config/themes";
import { formatLong, formatLongNb, type MonthDay } from "@/lib/birthday";
import { boostBoxTop } from "@/lib/boost";
import { BOARD_PAGE_SIZE, ctaCopy, filterByName, landingRank, moreText, searchCountText } from "@/lib/date-page";
import { firstName } from "@/lib/people";
import { absoluteUrl, routes } from "@/lib/routes";
import type { DateEntry } from "@/server/date-page";
import styles from "./date.module.css";
import { OPEN_DATE_PICKER } from "./DateNav";
import { EntryRow } from "./EntryRow";
import { useMediaQuery } from "./useMediaQuery";

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
  /** Today's end, when this is today's board: the Boost box warns near midnight. */
  dayEnd: { endsAt: string; serverNow: string } | null;
  /** From an outbid email's "Boost to take #1 back" link: open the Boost box for this person with the amount filled in. */
  initialBoost?: { publicId: string; amountCents: number } | null;
  /** A followed personal link: this person's card is highlighted, scrolled to and introduced by a banner. */
  focusPublicId?: string | null;
};

/**
 * The interactive part of the date page: the claim bar, name search and the
 * ranked board. Picking a card switches the bar to "Outrank [name] for $X"
 * (desktop scrolls up to it; phones outline the card and show an in-card
 * button instead). The ▲ pill opens the Boost box. The board shows 20 people
 * at a time; search covers everyone. Keyed by date, so search, picks and paging
 * reset when the date changes.
 */
export function DateBoard({
  md,
  isToday,
  giftsOpenLabel,
  entries,
  theme,
  shareUrl,
  settings,
  dayEnd,
  initialBoost,
  focusPublicId = null,
}: Props) {
  const [pickedRank, setPickedRank] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  // A personal link to someone past the first 20 loads enough of the board to show them.
  const focusIndex = focusPublicId ? entries.findIndex((e) => e.publicId === focusPublicId) : -1;
  const [limit, setLimit] = useState(
    Math.max(BOARD_PAGE_SIZE, Math.ceil((focusIndex + 1) / BOARD_PAGE_SIZE) * BOARD_PAGE_SIZE),
  );
  const focused = focusIndex >= 0 ? entries[focusIndex] : undefined;

  // Scroll to the followed person's card (ScrollToTop leaves pages with a scroll target alone).
  // Runs after the page has fully loaded, plus a beat (like the mockup): the browser restores its own
  // scroll position on load, which would otherwise undo this. It glides there like the mockup; a
  // smooth scroll can stall while the page is still settling, so if the card still isn't on screen
  // a second later it jumps the rest of the way.
  useEffect(() => {
    if (!focusPublicId) return;
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    const card = () => document.querySelector("[data-scroll-target]");
    const scroll = () => {
      timers.push(
        setTimeout(() => {
          const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          card()?.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
          timers.push(
            setTimeout(() => {
              const box = card()?.getBoundingClientRect();
              if (box && (box.bottom < 0 || box.top > window.innerHeight)) card()?.scrollIntoView({ block: "center" });
            }, 1000),
          );
        }, 350),
      );
    };
    if (document.readyState === "complete") scroll();
    else window.addEventListener("load", scroll, { once: true });
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("load", scroll);
    };
  }, [focusPublicId]);
  const mobile = useMediaQuery("(max-width: 640px)");
  // Opened from an email link ("Boost to take #1 back"): the Boost box starts open, at the top edge of the screen.
  const [boosting, setBoosting] = useState<{ entry: DateEntry; top: number } | null>(() => {
    const entry = initialBoost && entries.find((e) => e.publicId === initialBoost.publicId);
    return entry ? { entry, top: boostBoxTop(0, 0) } : null;
  });
  const opener = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const label = formatLongNb(md);
  const totals = entries.map((e) => e.totalCents);
  const landing = (entry: DateEntry) => landingRank(entry.totalCents, totals);
  const picked = pickedRank ? entries[pickedRank - 1] : undefined;
  const cta = ctaCopy({
    md,
    topTotalCents: entries[0]?.totalCents ?? null,
    picked: picked ? { name: picked.name, totalCents: picked.totalCents, landing: landing(picked) } : null,
    rules: settings,
  });
  const q = query.trim();
  const matched = filterByName(entries, query);
  const shown = matched.slice(0, limit);
  const more = matched.length > shown.length ? moreText(shown.length, matched.length) : null;

  function pick(rank: number) {
    // Phones: tapping a card toggles its outline and in-card button, no scrolling.
    if (mobile) {
      setPickedRank(pickedRank === rank ? null : rank);
      return;
    }
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
          {picked && picked.rank > 1 && (
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
          {q && matched.length > 0 && (
            <p className={styles.count} aria-live="polite">
              {searchCountText(matched.length, entries.length)}
            </p>
          )}
        </div>
      )}

      {q && matched.length === 0 && (
        <Surface outline="dashed" radius="card" padding="none" className={styles.noMatch}>
          <p className={styles.noMatchTitle}>
            No “{q}” on {label} yet
          </p>
          <p className={styles.noMatchText}>Know it’s their birthday? Send them the link so they can join.</p>
          <InviteButtons
            url={shareUrl}
            message={`Is your birthday ${formatLong(md)}? Claim it on mybday.lol`}
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
            <Fragment key={entry.publicId}>
              {entry === focused && (
                <li className={styles.followed}>
                  <p className={styles.followedText}>
                    You followed {firstName(entry.name)}’s link.{" "}
                    {isToday
                      ? "Send a gift or boost them to the top."
                      : "Boost them to the top, and come back on their birthday to send a gift."}
                  </p>
                  <Button
                    variant="paper"
                    size="md"
                    className={styles.followedButton}
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                      window.dispatchEvent(new Event(OPEN_DATE_PICKER));
                    }}
                  >
                    Find your birthday →
                  </Button>
                </li>
              )}
              <EntryRow
                entry={entry}
                isToday={isToday}
                giftsOpenLabel={giftsOpenLabel}
                theme={theme}
                shareUrl={entry.slug ? absoluteUrl(routes.person(md, entry.slug)) : shareUrl}
                rules={settings}
                focused={entry === focused}
                picked={mobile && pickedRank === entry.rank}
                claimHref={routes.claim(md, landing(entry))}
                onPick={() => pick(entry.rank)}
                onBoost={(button) => openBoost(entry, button)}
              />
            </Fragment>
          ))}
        </ol>
      )}

      {more && (
        <div className={styles.more}>
          <Button variant="paper" size="lg" shape="large" block className={styles.moreButton} onClick={() => setLimit(limit + BOARD_PAGE_SIZE)}>
            {more.button}
          </Button>
          <p className={styles.moreSub}>{more.sub}</p>
        </div>
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
        returnPath={routes.date(md)}
        dayEnd={dayEnd}
        initialAmountCents={
          initialBoost && boosting?.entry.publicId === initialBoost.publicId ? initialBoost.amountCents : undefined
        }
      />
    </>
  );
}
