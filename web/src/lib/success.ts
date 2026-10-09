import { formatLong, MONTHS, type MonthDay } from "./birthday";
import { formatUsd } from "./money";

/**
 * Success page copy. The mockup only shows "today's #1"; the other cases keep
 * the same layout and change the top text (decided, 07 B1). The page reads
 * the real result from the database, so a bid that got passed while paying
 * shows its real rank (07 B6).
 */

export type Placement = {
  md: MonthDay;
  /** Year of the board the claim landed on. */
  year: number;
  rank: number;
  /** today = the board is today's (owns the homepage at #1); upcoming = still to come; closed = its day has ended. */
  when: "today" | "upcoming" | "closed";
  /** Current year in the board's time zone, to decide whether "October 1" needs ", 2027". */
  currentYear: number;
  /** Smallest boost that takes #1 (rank 2+ on an open board). */
  toTopCents: number | null;
};

export type SuccessCopy = {
  kicker: string;
  /** Lines of the H1; the mockup breaks before "For now." */
  title: string[];
  sub: string;
  note: string;
  link: { label: string; to: "home" | "date" };
};

/** "October 12", or "October 1, 2027" when the board is in a later year. */
function dateLabel(p: Placement): string {
  const label = formatLong(p.md);
  return p.year > p.currentYear ? `${label}, ${p.year}` : label;
}

/** "October 7's" (possessive used in the note). */
function possessive(md: MonthDay): string {
  return `${MONTHS[md.month - 1]} ${md.day}'s`;
}

export function successCopy(p: Placement): SuccessCopy {
  const day = formatLong(p.md);
  const outbidNote = `If someone outbids you, we'll email you right away so you can bid back. Either way, you stay on ${possessive(p.md)} birthday list.`;
  const share = "Share it so everyone knows it's your day.";

  if (p.rank === 1 && p.when === "today") {
    return {
      kicker: "You're on the homepage",
      title: [`${day} is yours.`, "For now."],
      sub: share,
      note: outbidNote,
      link: { label: "See the homepage", to: "home" },
    };
  }
  if (p.rank === 1 && p.when === "upcoming") {
    return {
      kicker: `You're #1 for ${dateLabel(p)}`,
      title: [`${day} is yours.`, "For now."],
      sub: share,
      note: outbidNote,
      link: { label: `See ${possessive(p.md)} list`, to: "date" },
    };
  }
  // Rank 2+, or a board whose day ended while the payment landed (07 B5).
  const toTop = p.when !== "closed" && p.rank > 1 && p.toTopCents !== null;
  return {
    kicker: "You're on the list",
    title: [`You're #${p.rank} on ${day}.`],
    sub: toTop ? `${formatUsd(p.toTopCents!)} more takes #1. Share it so friends can boost you.` : share,
    // Outbid emails only go out when someone loses #1, so don't promise one here.
    note: `You stay on ${possessive(p.md)} birthday list, where friends can find you, boost you and send gifts.`,
    link: { label: `See ${possessive(p.md)} list`, to: "date" },
  };
}

/** Kicker on the shared link's card: "TODAY'S BIRTHDAY" on the day itself, "TOP BID" before it (the date page's badge). */
export function linkCardKicker(isToday: boolean): string {
  return isToday ? "Today's birthday" : "Top bid";
}

/** Stripe Checkout session ids look like "cs_test_a1B2…" / "cs_live_…". Anything else never reaches the database. */
export function isCheckoutSessionId(value: unknown): value is string {
  return typeof value === "string" && /^cs_(test|live)_[A-Za-z0-9]{8,200}$/.test(value);
}

/** While Stripe's webhook is on its way: poll every 1.5 s, and after ~45 s say it's taking a while. */
export const SUCCESS_POLL_MS = 1_500;
export const SUCCESS_SLOW_AFTER_MS = 45_000;
