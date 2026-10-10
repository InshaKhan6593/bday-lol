import type { BoardTypeSettings } from "@/config/board-types";
import {
  compareMonthDay,
  currentBoardYear,
  DAYS_IN_MONTH,
  daysUntil,
  formatLong,
  formatLongNb,
  formatShort,
  toKey,
  zonedDate,
  type MonthDay,
} from "./birthday";
import { formatUsd, minToPass, minToTakeTop } from "./money";
import { firstName } from "./people";

/** Rules for the date page ("Find your birthday"), worded exactly like the mockup. */

type MoneyRules = Pick<BoardTypeSettings, "minOpenBidCents" | "minStepCents">;

/** The next or previous date on the 366-day birthday calendar (Feb 29 included, Dec 31 wraps to Jan 1). */
export function adjacentDay({ month, day }: MonthDay, step: 1 | -1): MonthDay {
  if (step === 1) {
    return day < DAYS_IN_MONTH[month - 1]! ? { month, day: day + 1 } : { month: (month % 12) + 1, day: 1 };
  }
  if (day > 1) return { month, day: day - 1 };
  const prev = month === 1 ? 12 : month - 1;
  return { month: prev, day: DAYS_IN_MONTH[prev - 1]! };
}

export type DateStatus =
  | { kind: "today" }
  /** Later this year: "In 3 days". */
  | { kind: "soon"; days: number }
  /** Already passed this year (or Feb 29 outside a leap year): "Next one: Oct 1, 2027". */
  | { kind: "next"; year: number };

export function dateStatus(md: MonthDay, instant: Date, timeZone: string): DateStatus {
  const today = zonedDate(instant, timeZone);
  if (compareMonthDay(md, today) === 0) return { kind: "today" };
  const year = currentBoardYear(md, instant, timeZone);
  if (year === today.year) return { kind: "soon", days: daysUntil({ ...md, year }, instant, timeZone) };
  return { kind: "next", year };
}

/** Status line for any day but today (today shows the live countdown instead). */
export function statusText(md: MonthDay, status: Exclude<DateStatus, { kind: "today" }>): string {
  if (status.kind === "soon") {
    return `In ${status.days} ${status.days === 1 ? "day" : "days"} · Bidding is open`;
  }
  return `Next one: ${formatShort(md)}, ${status.year} · Bidding is open`;
}

/** Dashed pill on other days: "Gifts open Oct 7", with the year when it's not this year. */
export function giftsOpenText(md: MonthDay, status: DateStatus): string {
  return `Gifts open ${formatShort(md)}${status.kind === "next" ? `, ${status.year}` : ""}`;
}

/** "2:40 PM" in the board's time zone. */
export function formatClock(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone })
    .format(instant)
    .replace(/ /g, " ");
}

export type Stint = { startedAt: Date; endedAt: Date | null };

/**
 * The "held" line under a name on today's list, from the #1 log:
 * "On the homepage since 2:40 PM" for the current #1, otherwise their latest
 * stint "Held the homepage 9:12 AM – 2:40 PM". Null if they never held #1.
 */
export function heldText(stints: Stint[], timeZone: string): string | null {
  if (stints.length === 0) return null;
  const current = stints.find((s) => s.endedAt === null);
  if (current) return `On the homepage since ${formatClock(current.startedAt, timeZone)}`;
  const latest = stints.reduce((a, b) => (b.startedAt > a.startedAt ? b : a));
  return `Held the homepage ${formatClock(latest.startedAt, timeZone)} – ${formatClock(latest.endedAt!, timeZone)}`;
}

/** Hover popup on a card (and the mobile in-card button): "Outrank Jess for $241". */
export function outrankText(name: string, totalCents: number, rules: MoneyRules): string {
  return `Outrank ${firstName(name)} for ${formatUsd(minToPass(totalCents, rules))}`;
}

/**
 * Where paying someone's total + $1 really lands you. Ties keep the earlier
 * claim on top, so you go just above everyone tied at that total: 15 people at
 * $5 from #20 down, and outranking any of them for $6 lands you at #20.
 */
export function landingRank(totalCents: number, allTotalsCents: number[]): number {
  return allTotalsCents.filter((t) => t > totalCents).length + 1;
}

type CtaInput = {
  md: MonthDay;
  topTotalCents: number | null;
  /** The card someone picked (any rank, #1 included) and where outranking them lands. */
  picked: { name: string; totalCents: number; landing: number } | null;
  rules: MoneyRules;
};

/** Black bar above the board: "Own the top spot", or "Outrank Tyler for $226" after picking a card. */
export function ctaCopy({ md, topTotalCents, picked, rules }: CtaInput) {
  const label = formatLongNb(md);
  if (!picked) {
    return {
      title: "Own the top spot",
      sub: `Bid ${formatUsd(minToTakeTop(topTotalCents, rules))} or more.`,
      button: `Bid on ${label}`,
      rank: null,
    };
  }
  const price = formatUsd(minToPass(picked.totalCents, rules));
  const outrank = outrankText(picked.name, picked.totalCents, rules);
  return {
    title: outrank,
    sub: `Bid ${price} or more to move up to #${picked.landing}.`,
    button: outrank,
    rank: picked.landing,
  };
}

/** The board shows this many people, then "Show 20 more". */
export const BOARD_PAGE_SIZE = 20;

/** "Show 20 more" / "Showing 20 of 34 people" under the board. */
export function moreText(shown: number, total: number, pageSize = BOARD_PAGE_SIZE) {
  return { button: `Show ${Math.min(pageSize, total - shown)} more`, sub: `Showing ${shown} of ${total} people` };
}

/** Name search on one date: case-insensitive, ignores surrounding spaces. */
export function filterByName<T extends { name: string }>(people: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  return q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;
}

/** "3 of 8 people" while a search has matches. */
export function searchCountText(shown: number, total: number): string {
  return `${shown} of ${total} people`;
}

export type CalendarCell = {
  md: MonthDay;
  /** "$240", or "open" when nobody has bid. */
  sub: string;
  aria: string;
  state: "selected" | "today" | "plain";
};

/**
 * One month of the date picker. No weekday offset and no year: a birthday has
 * neither, so February always shows 29 days.
 */
export function calendarCells(
  month: number,
  topTotalsByKey: Record<string, number>,
  selected: MonthDay,
  today: MonthDay,
): CalendarCell[] {
  return Array.from({ length: DAYS_IN_MONTH[month - 1]! }, (_, i) => {
    const md = { month, day: i + 1 };
    const top = topTotalsByKey[toKey(md)];
    const state =
      compareMonthDay(md, selected) === 0 ? "selected" : compareMonthDay(md, today) === 0 ? "today" : "plain";
    return {
      md,
      sub: top === undefined ? "open" : formatUsd(top),
      aria: `${formatLong(md)}, ${top === undefined ? "unclaimed" : `top bid ${formatUsd(top)}`}`,
      state,
    };
  });
}
