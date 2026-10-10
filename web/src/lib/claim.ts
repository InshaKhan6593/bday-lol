import type { BoardTypeSettings } from "@/config/board-types";
import { isThemeKey, type ThemeKey } from "@/config/themes";
import type { GiftLink } from "@/db/schema";
import { DAYS_IN_MONTH, parseSlug, type MonthDay } from "./birthday";
import { parseAmountCents } from "./boost";
import { GIFT_ENTRY, parseGiftEntry, type GiftEntry } from "./gifts";
import { formatUsd, minToTakeTop } from "./money";
import { cleanName, stripWrappingQuotes } from "./people";

/** Rules for the Claim page, worded exactly like the mockup (ClaimDesktop.dc.html / Claim.dc.html). */

type MoneyRules = Pick<BoardTypeSettings, "minOpenBidCents" | "minStepCents">;

// ---------------------------------------------------------------------------
// URL: /claim?date=october-7&rank=2
// ---------------------------------------------------------------------------

export type ClaimParams = { md: MonthDay | null; rank: number };

/** Reads ?date=october-7&rank=2. A bad date means "no date" (the page uses today); a bad rank means #1. */
export function parseClaimParams(params: { date?: string | string[]; rank?: string | string[] }): ClaimParams {
  const date = typeof params.date === "string" ? parseSlug(params.date) : null;
  const rankText = typeof params.rank === "string" ? params.rank : "";
  const rank = /^[1-9]\d{0,3}$/.test(rankText) ? Number(rankText) : 1;
  return { md: date?.kind === "date" ? date.md : null, rank };
}

/** Switching month keeps the day when it exists, otherwise moves to the month's last day (Oct 31 → Nov 30). */
export function withMonth(md: MonthDay, month: number): MonthDay {
  return { month, day: Math.min(md.day, DAYS_IN_MONTH[month - 1]!) };
}

// ---------------------------------------------------------------------------
// Who you're trying to pass
// ---------------------------------------------------------------------------

/** The person in the black box: the #1, the rank picked with "Claim this rank", or nobody. */
export type ClaimTarget = { rank: number; name: string | null; totalCents: number | null };

/**
 * Rank N comes from "Claim #N" on the date page. If that rank no longer
 * exists (people got removed) it falls back to the #1.
 */
export function claimTarget(ranked: Array<{ name: string; totalCents: number }>, rank: number): ClaimTarget {
  const picked = rank > 1 ? ranked[rank - 1] : undefined;
  if (picked) return { rank, name: picked.name, totalCents: picked.totalCents };
  const top = ranked[0];
  return top ? { rank: 1, name: top.name, totalCents: top.totalCents } : { rank: 1, name: null, totalCents: null };
}

/** Smallest bid that passes the target: their total + $1, or the opening bid on an empty date. */
export function claimMinCents(target: ClaimTarget, rules: MoneyRules): number {
  return minToTakeTop(target.totalCents, rules);
}

/** Black box copy: "CURRENT LEADER" / "CURRENT #2", "Nobody yet" / "$0". */
export function targetBox(target: ClaimTarget): { label: string; name: string; amount: string } {
  return {
    label: target.rank > 1 ? `Current #${target.rank}` : "Current leader",
    name: target.name ?? "Nobody yet",
    amount: formatUsd(target.totalCents ?? 0),
  };
}

function goal(target: ClaimTarget, homepage: string): string {
  return target.rank > 1 ? `take #${target.rank}` : homepage;
}

/** "$241 or more to claim the homepage" / "$226 or more to take #2" (mobile prefixes "Bid "). */
export function bidHint(target: ClaimTarget, minCents: number): string {
  return `${formatUsd(minCents)} or more to ${goal(target, "claim the homepage")}`;
}

/** Under the bid box when it's too low (decided, 07 B23). Null when the bid is fine. */
export function bidError(amountCents: number, minCents: number, target: ClaimTarget): string | null {
  if (amountCents >= minCents) return null;
  return `Bid at least ${formatUsd(minCents)} to ${goal(target, "take the homepage")}.`;
}

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

export type ClaimInput = {
  md: MonthDay;
  bid: string;
  name: string;
  bio: string;
  /** The gift rows: an app + a username or wishlist link each. */
  giftLinks: GiftEntry[];
  theme: string;
  email: string;
};

export type ClaimField = "bid" | "name" | "bio" | "giftLinks" | "theme" | "email";

export type ValidClaim = {
  md: MonthDay;
  amountCents: number;
  name: string;
  bio: string;
  giftLinks: GiftLink[];
  theme: ThemeKey;
  email: string;
};

export type ClaimResult = { ok: true; claim: ValidClaim } | { ok: false; errors: Partial<Record<ClaimField, string>> };

type FormRules = Pick<BoardTypeSettings, "nameMaxLength" | "bioMaxLength" | "maxGiftLinks">;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** One space between words, no leading or trailing spaces. */
function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Checks a claim before checkout. The browser runs it to show errors; the
 * server runs it again before creating the Stripe session.
 */
export function validateClaim(input: ClaimInput, minCents: number, target: ClaimTarget, rules: FormRules): ClaimResult {
  const errors: Partial<Record<ClaimField, string>> = {};

  const amountCents = parseAmountCents(input.bid);
  const tooLow = bidError(amountCents, minCents, target);
  if (tooLow) errors.bid = tooLow;

  const name = cleanName(input.name);
  if (!name) errors.name = "Add a name to continue.";
  else if (name.length > rules.nameMaxLength) errors.name = `Names can be up to ${rules.nameMaxLength} characters.`;

  const bio = stripWrappingQuotes(tidy(input.bio));
  if (bio.length > rules.bioMaxLength) errors.bio = `Bios can be up to ${rules.bioMaxLength} characters.`;

  // One link per app (handoff v2): Venmo, Cash App, Amazon, Throne.
  const rows = input.giftLinks.filter((row) => row.value.trim());
  const bad = rows.find((row) => parseGiftEntry(row).kind === "bad");
  const giftLinks = rows.flatMap((row) => {
    const parsed = parseGiftEntry(row);
    return parsed.kind === "ok" ? [parsed.link] : [];
  });
  if (bad) errors.giftLinks = GIFT_ENTRY[bad.service].error;
  else if (new Set(giftLinks.map((l) => l.service)).size < giftLinks.length) errors.giftLinks = "Add one link per app.";
  else if (giftLinks.length > rules.maxGiftLinks) errors.giftLinks = `Add up to ${rules.maxGiftLinks} links.`;

  if (!isThemeKey(input.theme)) errors.theme = "Pick a color.";

  const email = input.email.trim();
  if (!EMAIL.test(email) || email.length > 254) errors.email = "Enter your email for the receipt.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    claim: { md: input.md, amountCents, name, bio, giftLinks, theme: input.theme as ThemeKey, email: email.toLowerCase() },
  };
}

// ---------------------------------------------------------------------------
// Photo
// ---------------------------------------------------------------------------

/** Photos are cropped to a centered square and resized to this many pixels (decided, 07 B7). */
export const PHOTO_SIZE = 512;

/** The centered square to cut from a w×h image: { x, y, size } in source pixels. */
export function squareCrop(width: number, height: number): { x: number; y: number; size: number } {
  const size = Math.min(width, height);
  return { x: Math.round((width - size) / 2), y: Math.round((height - size) / 2), size };
}
