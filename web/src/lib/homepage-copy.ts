import { formatUsd } from "./money";
import { shortName } from "./people";

/** "7 other people are celebrating October 7" (1 → "1 other person is celebrating"). */
export function othersText(count: number, dateLabel: string): string {
  return count === 1
    ? `1 other person is celebrating ${dateLabel}`
    : `${count} other people are celebrating ${dateLabel}`;
}

/** Coming-up card copy: "Marcus T." / "Claimed for $85", or "Unclaimed" / "Claim for $5". */
export function comingUpCopy(
  day: { leaderName: string | null; topTotalCents: number | null },
  openBidCents: number,
): { owner: string; price: string } {
  return day.leaderName && day.topTotalCents !== null
    ? { owner: shortName(day.leaderName), price: `Claimed for ${formatUsd(day.topTotalCents)}` }
    : { owner: "Unclaimed", price: `Claim for ${formatUsd(openBidCents)}` };
}
