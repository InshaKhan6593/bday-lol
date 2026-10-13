import { formatLong, MONTHS, type MonthDay } from "./birthday";
import { formatUsd } from "./money";
import { shortName } from "./people";

/** "7 other people are celebrating October 7" (1 → "1 other person is celebrating"). */
export function othersText(count: number, dateLabel: string): string {
  return count === 1
    ? `1 other person is celebrating ${dateLabel}`
    : `${count} other people are celebrating ${dateLabel}`;
}

/** A phone's "Coming up" strip holds the first week; a wide screen shows every date it is given. */
export const COMING_UP_NARROW_DAYS = 7;

/**
 * One date in the "Coming up" strip: the top bid under the day ("$85"), or "open".
 * The strip has no room for the name, so `tip` is the pop-up over the date
 * ("Marcus T. · $85") and `label` the whole story for a screen reader.
 */
export function comingUpCell(
  day: { md: MonthDay; leaderName: string | null; topTotalCents: number | null },
  openBidCents: number,
): { sub: string; claimed: boolean; tip: string; label: string } {
  const date = formatLong(day.md);
  return day.leaderName && day.topTotalCents !== null
    ? {
        sub: formatUsd(day.topTotalCents),
        claimed: true,
        tip: `${shortName(day.leaderName)} · ${formatUsd(day.topTotalCents)}`,
        label: `${date}: ${shortName(day.leaderName)} leads with ${formatUsd(day.topTotalCents)}`,
      }
    : {
        sub: "open",
        claimed: false,
        tip: `Open · claim from ${formatUsd(openBidCents)}`,
        label: `${date}: open, bids start at ${formatUsd(openBidCents)}`,
      };
}

/** How many dates at each end of the strip keep their pop-up inside the bar. */
const TIP_EDGE_DAYS = 2;

/**
 * Which way the pop-up over date `i` leans in a strip of `count` dates: inwards
 * near either end (a centred one would run off the page), centred otherwise.
 */
export function comingUpTipSide(i: number, count: number): "start" | "end" | undefined {
  if (i < TIP_EDGE_DAYS) return "start";
  if (i >= count - TIP_EDGE_DAYS) return "end";
  return undefined;
}

/** The strip's month line: "October", or "October – November" when the dates run into the next month. */
export function comingUpMonths(days: Array<{ md: MonthDay }>): string {
  const months: number[] = [];
  for (const { md } of days) if (months.at(-1) !== md.month) months.push(md.month);
  return months.map((m) => MONTHS[m - 1]).join(" – ");
}
