import { getTheme, type ThemeKey } from "@/config/themes";
import type { GiftLink } from "@/db/schema";
import { formatLong, MONTHS, type MonthDay } from "./birthday";
import type { EmailBlock, EmailContent } from "./email-render";
import { formatMinorUnits } from "./email-render";
import { GIFT_SERVICES } from "./gifts";
import { formatUsd } from "./money";
import { firstName } from "./people";

/**
 * The 8 emails (spec §8). Pure: data in, wording out. Sending, dedupe and
 * unsubscribe links live in server/email. Each one opens like the homepage:
 * a kicker over a giant title, in the person's colors.
 */

/** "October 7's" */
function possessive(md: MonthDay): string {
  return `${MONTHS[md.month - 1]} ${md.day}'s`;
}

/** "October 7", or "October 1, 2027" when the board is a later year. */
function dateWithYear(md: MonthDay, year: number, currentYear: number): string {
  return year > currentYear ? `${formatLong(md)}, ${year}` : formatLong(md);
}

function colors(theme: ThemeKey): { ground: string; accent: string } {
  const t = getTheme(theme);
  return { ground: t.ground, accent: t.accent };
}

export type Receipt = {
  amountCents: number;
  /** What the payer saw at checkout, in Stripe minor units. Null when they paid in USD. */
  presentment: { currency: string; amount: number } | null;
  paidAt: Date;
  /** Stripe payment id, for questions and manual refunds. */
  reference: string | null;
  /** "Claim October 7, 2026 on bday.lol" */
  item: string;
};

function receiptRows(r: Receipt, timeZone: string): EmailBlock {
  const paid = r.presentment
    ? `${formatUsd(r.amountCents)} (${formatMinorUnits(r.presentment.amount, r.presentment.currency)} at checkout)`
    : formatUsd(r.amountCents);
  const date = r.paidAt.toLocaleDateString("en-US", { timeZone, month: "short", day: "numeric", year: "numeric" });
  return {
    kind: "rows",
    title: "Receipt",
    rows: [
      ["For", r.item],
      ["Paid", paid],
      ["Date", date],
      ...(r.reference ? ([["Reference", r.reference]] as Array<[string, string]>) : []),
    ],
  };
}

type Person = { name: string; bio: string; photoUrl: string | null; theme: ThemeKey };

// ---------------------------------------------------------------------------
// 1. Claim confirmation (doubles as the receipt)
// ---------------------------------------------------------------------------

export type ClaimConfirmationInput = Person & {
  md: MonthDay;
  year: number;
  currentYear: number;
  rank: number;
  totalCents: number;
  /** Smallest boost that takes #1 (rank 2+). */
  toTopCents: number | null;
  isToday: boolean;
  shareUrl: string;
  receipt: Receipt;
  timeZone: string;
};

export function claimConfirmationEmail(i: ClaimConfirmationInput): EmailContent {
  const day = formatLong(i.md);
  const label = dateWithYear(i.md, i.year, i.currentYear);
  const top = i.rank === 1;
  const subject = top
    ? i.isToday
      ? `You're on the homepage: ${day} is yours`
      : `${label} is yours (for now)`
    : `You're #${i.rank} on ${label}`;
  const lead = top
    ? i.isToday
      ? "You own today's bday.lol homepage. Share it so everyone knows it's your day."
      : `You're #1 for ${label}. Share it so friends know it's coming.`
    : `Someone got there first, so you're #${i.rank}.${i.toTopCents ? ` ${formatUsd(i.toTopCents)} more takes #1, and friends can boost you from your date's page.` : ""}`;
  return {
    subject,
    preheader: lead,
    kicker: top ? (i.isToday ? "You're on the homepage" : "You're #1 for") : `You're #${i.rank} on`,
    title: label,
    ...colors(i.theme),
    blocks: [
      { kind: "person", name: i.name, line: `${formatUsd(i.totalCents)} · #${i.rank} on ${day}`, photoUrl: i.photoUrl },
      { kind: "p", text: lead },
      { kind: "button", label: "Share your date", url: i.shareUrl },
      {
        kind: "note",
        text: top
          ? `If someone outbids you, we'll email you right away so you can bid back. Either way, you stay on ${possessive(i.md)} birthday list.`
          : `You stay on ${possessive(i.md)} birthday list, where friends can find you, boost you and send gifts.`,
      },
      receiptRows(i.receipt, i.timeZone),
      { kind: "fine", text: "Bids are final. Questions about this payment? Reply to this email." },
    ],
    reason: `You're getting this because you claimed ${day} on bday.lol.`,
  };
}

// ---------------------------------------------------------------------------
// 2. Boost receipt
// ---------------------------------------------------------------------------

export type BoostReceiptInput = Person & {
  md: MonthDay;
  rank: number;
  totalCents: number;
  alertOptIn: boolean;
  dateUrl: string;
  receipt: Receipt;
  timeZone: string;
};

export function boostReceiptEmail(i: BoostReceiptInput): EmailContent {
  const first = firstName(i.name);
  const day = formatLong(i.md);
  const amount = formatUsd(i.receipt.amountCents);
  const standing = i.rank === 1 ? `That puts ${first} at #1 on ${day}.` : `${first} is #${i.rank} on ${day}.`;
  return {
    subject: `Your ${amount} boost for ${first} is in`,
    preheader: `${first} now has ${formatUsd(i.totalCents)}. ${standing}`,
    kicker: `You boosted ${first}`,
    title: `+${amount}`,
    ...colors(i.theme),
    blocks: [
      { kind: "person", name: i.name, line: `${formatUsd(i.totalCents)} · #${i.rank} on ${day}`, photoUrl: i.photoUrl },
      { kind: "p", text: `Thanks! ${standing}` },
      { kind: "button", label: `See ${possessive(i.md)} list`, url: i.dateUrl },
      ...(i.alertOptIn ? [{ kind: "note" as const, text: `We'll email you if ${first} gets passed.` }] : []),
      receiptRows(i.receipt, i.timeZone),
      {
        kind: "fine",
        text: `Boosts are final and add to ${first}'s total. They're paid to bday.lol, not to ${first}. Gifts still go straight to them.`,
      },
    ],
    reason: `You're getting this because you boosted ${i.name} on bday.lol.`,
  };
}

// ---------------------------------------------------------------------------
// 3. Outbid alert
// ---------------------------------------------------------------------------

export type OutbidAlertInput = Person & {
  md: MonthDay;
  /** The email goes to the person who got passed (vs. a fan on their alert list). */
  isOwner: boolean;
  newTopName: string;
  /** The latest amount needed to take #1 back. */
  amountCents: number;
  /** Their total and rank right now (the email can go out up to 15 min after they were passed). */
  totalCents: number;
  rank: number;
  boostUrl: string;
};

export function outbidAlertEmail(i: OutbidAlertInput): EmailContent {
  const first = firstName(i.name);
  const day = formatLong(i.md);
  const amount = formatUsd(i.amountCents);
  return {
    subject: i.isOwner ? `You just got passed on ${day}` : `${first} just got passed on ${day}`,
    preheader: `${amount} takes #1 back.`,
    kicker: i.isOwner ? "You just got passed on" : `${first} just got passed on`,
    title: day,
    ...colors(i.theme),
    blocks: [
      { kind: "person", name: i.name, line: `${formatUsd(i.totalCents)} · now #${i.rank} on ${day}`, photoUrl: i.photoUrl },
      { kind: "p", text: `${firstName(i.newTopName)} is #1 now. ${i.isOwner ? "You can" : `You can boost ${first} and`} take it back.` },
      { kind: "bar", title: `Take #1 back for ${amount}`, sub: "Boosts add to the total and are final.", label: `Boost ${amount}`, url: i.boostUrl },
      ...(i.isOwner
        ? [{ kind: "note" as const, text: `You're still on ${possessive(i.md)} birthday list, and gifts still reach you.` }]
        : []),
    ],
    reason: i.isOwner
      ? `You're getting this because you claimed ${day} on bday.lol.`
      : `You're getting this because you asked us to email you if ${first} gets passed.`,
  };
}

// ---------------------------------------------------------------------------
// 4 + 7. Birthday reminder (signups) and yearly re-claim (last year's claimers)
// ---------------------------------------------------------------------------

export type ReminderInput = {
  md: MonthDay;
  /** "signup" = homepage reminder; "claim" = they claimed this date last year. */
  source: "signup" | "claim";
  /** Current top total on the date's open board, or null when nobody has bid. */
  topTotalCents: number | null;
  /** What it takes to claim the top spot right now. */
  minCents: number;
  claimUrl: string;
};

export function reminderEmail(i: ReminderInput): EmailContent {
  const day = formatLong(i.md);
  const again = i.source === "claim";
  const price =
    i.topTotalCents === null
      ? `Nobody has claimed it yet. Bids start at ${formatUsd(i.minCents)}.`
      : `The top bid is ${formatUsd(i.topTotalCents)} right now.`;
  return {
    subject: again ? `Claim ${day} again: it's a week away` : `Your birthday is a week away: claim ${day} first`,
    preheader: price,
    kicker: again ? "It's back in a week" : "A week to go",
    title: day,
    blocks: [
      {
        kind: "p",
        text: again
          ? `Last year you claimed ${day}. It's back in a week, and the board starts fresh. Claim it again before someone else does.`
          : "Claim it before someone else does. The highest bid gets the bday.lol homepage for the whole day.",
      },
      { kind: "bar", title: `Own ${day} for ${formatUsd(i.minCents)}`, sub: price, label: `Claim ${day}`, url: i.claimUrl },
    ],
    reason: again
      ? `You're getting this because you claimed ${day} on bday.lol last year. One email a year.`
      : `You asked us to remind you a week before ${day}. One email a year.`,
  };
}

// ---------------------------------------------------------------------------
// 5. "Your day is here" (8:00 AM ET on the day)
// ---------------------------------------------------------------------------

export type YourDayInput = Person & {
  md: MonthDay;
  rank: number;
  totalCents: number;
  hasGiftLinks: boolean;
  dateUrl: string;
};

export function yourDayEmail(i: YourDayInput): EmailContent {
  const first = firstName(i.name);
  const day = formatLong(i.md);
  const standing =
    i.rank === 1
      ? "You're #1 today, so you're on the bday.lol homepage until midnight ET, unless someone outbids you."
      : `You're #${i.rank} on today's list.`;
  return {
    subject: `Happy birthday, ${first}! ${day} is here`,
    preheader: standing,
    kicker: `Happy birthday, ${first}`,
    title: day,
    ...colors(i.theme),
    blocks: [
      { kind: "person", name: i.name, line: `${formatUsd(i.totalCents)} · #${i.rank} today`, photoUrl: i.photoUrl },
      { kind: "p", text: standing },
      {
        kind: "p",
        text: i.hasGiftLinks
          ? "Your gift buttons are live today. Share your link so friends can send something."
          : "Share your link so friends know it's your day.",
      },
      { kind: "button", label: "Share your day", url: i.dateUrl },
    ],
    reason: `You're getting this because you're on ${possessive(i.md)} birthday list on bday.lol.`,
  };
}

// ---------------------------------------------------------------------------
// 6. "You got boosted" (bundled about once an hour)
// ---------------------------------------------------------------------------

export type BoostDigestInput = Person & {
  md: MonthDay;
  count: number;
  addedCents: number;
  totalCents: number;
  rank: number;
  dateUrl: string;
};

export function boostDigestEmail(i: BoostDigestInput): EmailContent {
  const day = formatLong(i.md);
  const added = formatUsd(i.addedCents);
  return {
    subject: `You got boosted: +${added} on ${day}`,
    preheader: `Your total is now ${formatUsd(i.totalCents)}.`,
    kicker: i.count === 1 ? "Someone boosted you" : `${i.count} boosts for you`,
    title: `+${added}`,
    ...colors(i.theme),
    blocks: [
      { kind: "person", name: i.name, line: `${formatUsd(i.totalCents)} · #${i.rank} on ${day}`, photoUrl: i.photoUrl },
      { kind: "p", text: `Your total is now ${formatUsd(i.totalCents)}, and you're #${i.rank} on ${day}.` },
      { kind: "button", label: `See ${possessive(i.md)} list`, url: i.dateUrl },
    ],
    reason: `You're getting this because you're on ${possessive(i.md)} birthday list on bday.lol.`,
  };
}

// ---------------------------------------------------------------------------
// 8. Admin alert (a copy of every new claim, for moderation)
// ---------------------------------------------------------------------------

export type AdminClaimInput = Person & {
  md: MonthDay;
  year: number;
  amountCents: number;
  rank: number;
  email: string;
  giftLinks: GiftLink[];
  dateUrl: string;
};

export function adminClaimEmail(i: AdminClaimInput): EmailContent {
  const day = formatLong(i.md);
  return {
    subject: `New claim: ${i.name} on ${day} (${formatUsd(i.amountCents)})`,
    preheader: `#${i.rank} on ${day}, ${i.year}.`,
    kicker: "New claim",
    title: day,
    ...colors(i.theme),
    blocks: [
      { kind: "person", name: i.name, line: i.bio || "(no bio)", photoUrl: i.photoUrl },
      {
        kind: "rows",
        rows: [
          ["Date", `${day}, ${i.year}`],
          ["Paid", formatUsd(i.amountCents)],
          ["Rank", `#${i.rank}`],
          ["Email", i.email],
          ["Color", getTheme(i.theme).name],
          ...i.giftLinks.map((l) => [GIFT_SERVICES[l.service].short, l.url] as [string, string]),
          ...(i.photoUrl ? ([["Photo", i.photoUrl]] as Array<[string, string]>) : []),
        ],
      },
      { kind: "button", label: `Open ${possessive(i.md)} list`, url: i.dateUrl },
      { kind: "fine", text: "If the photo, name or bio is offensive, remove it from the admin view." },
    ],
    reason: "You're getting this because you're the bday.lol admin.",
  };
}
