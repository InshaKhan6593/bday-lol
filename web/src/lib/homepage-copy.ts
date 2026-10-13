import { formatLong, MONTHS, type MonthDay } from "./birthday";
import { formatUsd } from "./money";
import { shortName } from "./people";

/** "7 other people are celebrating October 7" (1 → "1 other person is celebrating"). */
export function othersText(count: number, dateLabel: string): string {
  return count === 1
    ? `1 other person is celebrating ${dateLabel}`
    : `${count} other people are celebrating ${dateLabel}`;
}

/** Wide screens show the first few coming-up dates as cards; a phone shows every date it is given as a strip. */
export const COMING_UP_CARD_DAYS = 4;

/**
 * Coming-up card copy (wide screens): "Marcus T." / "Claimed for $85", or "Unclaimed" / "Claim for $5".
 * `claimed` lets the card show "Unclaimed" as a status tag instead of a name.
 */
export function comingUpCopy(
  day: { leaderName: string | null; topTotalCents: number | null },
  openBidCents: number,
): { owner: string; price: string; claimed: boolean } {
  return day.leaderName && day.topTotalCents !== null
    ? { owner: shortName(day.leaderName), price: `Claimed for ${formatUsd(day.topTotalCents)}`, claimed: true }
    : { owner: "Unclaimed", price: `Claim for ${formatUsd(openBidCents)}`, claimed: false };
}

/**
 * One date in the phone's "Coming up" strip: the top bid under the day ("$85"), or "open".
 * The strip has no room for the name, so `label` tells a screen reader the whole story.
 */
export function comingUpCell(
  day: { md: MonthDay; leaderName: string | null; topTotalCents: number | null },
  openBidCents: number,
): { sub: string; claimed: boolean; label: string } {
  const date = formatLong(day.md);
  return day.leaderName && day.topTotalCents !== null
    ? {
        sub: formatUsd(day.topTotalCents),
        claimed: true,
        label: `${date}: ${shortName(day.leaderName)} leads with ${formatUsd(day.topTotalCents)}`,
      }
    : { sub: "open", claimed: false, label: `${date}: open, bids start at ${formatUsd(openBidCents)}` };
}

/** The strip's month line: "October", or "October – November" when the dates run into the next month. */
export function comingUpMonths(days: Array<{ md: MonthDay }>): string {
  const months: number[] = [];
  for (const { md } of days) if (months.at(-1) !== md.month) months.push(md.month);
  return months.map((m) => MONTHS[m - 1]).join(" – ");
}
