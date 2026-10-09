import { parseSlug } from "./birthday";
import { formatUsd } from "./money";
import { firstName } from "./people";

/**
 * Boost box math. Totals are cents. Ties go to whoever reached the total
 * first, so matching someone's total never passes them.
 */

/** Rank this entry would have with a new total: everyone at or above it stays ahead. */
export function rankWithTotal(newTotalCents: number, otherTotalsCents: number[]): number {
  return 1 + otherTotalsCents.filter((total) => total >= newTotalCents).length;
}

/** The "Take #1: +$X" chip amount: enough to beat #1, never under the minimum boost. */
export function takeTopBoost(topTotalCents: number, ownTotalCents: number, minBoostCents: number): number {
  return Math.max(minBoostCents, topTotalCents - ownTotalCents + 100);
}

type ResultInput = {
  amountCents: number;
  minBoostCents: number;
  firstName: string;
  /** Current rank, 1-based. */
  rank: number;
  totalCents: number;
  otherTotalsCents: number[];
};

/** The live line in the Boost box, worded exactly like the mockup. */
export function boostResultLine({
  amountCents,
  minBoostCents,
  firstName,
  rank,
  totalCents,
  otherTotalsCents,
}: ResultInput): string {
  if (amountCents < minBoostCents) return `Boosts start at ${formatUsd(minBoostCents)}.`;
  const newTotal = totalCents + amountCents;
  const lead = `New total ${formatUsd(newTotal)}.`;
  if (rank === 1) return `${lead} Keeps ${firstName} at #1.`;
  const newRank = rankWithTotal(newTotal, otherTotalsCents);
  if (newRank === 1) return `${lead} Takes #1!`;
  if (newRank < rank) return `${lead} Moves ${firstName} up to #${newRank}.`;
  return `${lead} Stays at #${rank}.`;
}

/** Parses the "Other amount" field to whole-dollar cents. 0 when empty or invalid. */
export function parseAmountCents(input: string): number {
  const dollars = parseFloat(input.replace(/[^0-9.]/g, ""));
  return dollars > 0 ? Math.round(dollars) * 100 : 0;
}

/** Approximate height of the Boost box, used to keep all of it on screen. */
const BOOST_BOX_HEIGHT = 560;
const EDGE = 16;

/**
 * Where the Boost box opens (px from the top of the viewport): about 300px above
 * the button that opened it, clamped so the whole box is visible without
 * scrolling (mockup: top = buttonTop - 300, kept inside the viewport).
 */
export function boostBoxTop(buttonTop: number, viewportHeight: number): number {
  return Math.round(Math.max(EDGE, Math.min(buttonTop - 300, viewportHeight - BOOST_BOX_HEIGHT)));
}

/**
 * Where Stripe sends a booster back: the homepage or a date page. Anything
 * else (other sites, other paths) falls back to the homepage, so the Boost
 * form can't be used as an open redirect.
 */
export function boostReturnPath(raw: unknown): string {
  if (raw === "/") return "/";
  if (typeof raw !== "string" || !/^\/[a-z]+-\d{1,2}$/.test(raw)) return "/";
  return parseSlug(raw.slice(1))?.kind === "date" ? raw : "/";
}

/** The note after a boost lands: "Thanks! Your $5 boost is in. Jess is #1 with $245." */
export function boostedText(p: { name: string; amountCents: number; rank: number; totalCents: number }): string {
  const first = firstName(p.name);
  const standing = p.rank === 1 ? `${first} is #1` : `${first} is now #${p.rank}`;
  return `Thanks! Your ${formatUsd(p.amountCents)} boost is in. ${standing} with ${formatUsd(p.totalCents)}.`;
}

/** Reads "?boost=<publicId>&amount=16" from an outbid email link. Null when it isn't a usable link. */
export function parseBoostLink(
  params: { boost?: string | string[]; amount?: string | string[] },
  minBoostCents: number,
): { publicId: string; amountCents: number } | null {
  const { boost, amount } = params;
  if (typeof boost !== "string" || !/^[A-Za-z0-9_-]{6,16}$/.test(boost)) return null;
  const dollars = typeof amount === "string" && /^\d{1,6}$/.test(amount) ? Number(amount) : 0;
  return { publicId: boost, amountCents: Math.max(minBoostCents, dollars * 100) };
}
