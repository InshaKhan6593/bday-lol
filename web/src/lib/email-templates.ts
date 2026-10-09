import { getTheme, type ThemeKey } from "@/config/themes";
import type { GiftLink } from "@/db/schema";
import { formatLong, formatShort, MONTHS, type MonthDay } from "./birthday";
import type { EmailBlock, EmailContent } from "./email-render";
import { formatMinorUnits } from "./email-render";
import { GIFT_SERVICES } from "./gifts";
import { formatUsd } from "./money";
import { firstName } from "./people";

/**
 * The 8 emails (spec §8). Pure: data in, wording out. Sending, dedupe and
 * unsubscribe links live in server/email.
 *
 * Writing rules (researched, see 08-emails.md):
 * - The subject says what happened, with names, dates and amounts, in ~50 characters or less.
 * - The preview line adds the next fact; it never repeats the subject.
 * - One or two short sentences in the brand's voice, then ONE button.
 * - Exact times ("midnight ET"), and a receipt wherever money changed hands.
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
  const total = formatUsd(i.totalCents);

  if (i.rank > 1) {
    const toTop = i.toTopCents ? `${formatUsd(i.toTopCents)} more takes #1. ` : "";
    return {
      subject: `You're #${i.rank} on ${label}`,
      preheader: `${toTop}Friends can boost you from your page.`,
      kicker: `You're #${i.rank} on`,
      title: label,
      ...colors(i.theme),
      blocks: [
        { kind: "person", name: i.name, line: `${total} · #${i.rank} on ${day}`, photoUrl: i.photoUrl },
        { kind: "p", text: `Someone bid more while you were paying. ${toTop}Share your link and friends can boost you there.` },
        { kind: "button", label: "Share your link", url: i.shareUrl },
        receiptRows(i.receipt, i.timeZone),
        { kind: "fine", text: "Bids are final. Questions? Just reply to this email." },
      ],
      reason: `You're getting this because you claimed ${day} on bday.lol.`,
    };
  }

  const lead = i.isToday
    ? "You're on the bday.lol homepage until midnight ET, unless someone outbids you. If they do, we'll email you right away."
    : `Stay on top and the bday.lol homepage is yours all day on ${day}. If someone outbids you, we'll email you right away.`;
  return {
    subject: `${label} is yours. For now.`,
    preheader: i.isToday ? `You're on the homepage with ${total}.` : `You're #1 with ${total}. Share it so friends know it's coming.`,
    kicker: i.isToday ? "You're on the homepage" : "You're #1 for",
    title: label,
    ...colors(i.theme),
    blocks: [
      { kind: "person", name: i.name, line: `${total} · #1 on ${day}`, photoUrl: i.photoUrl },
      { kind: "p", text: lead },
      { kind: "button", label: "Share your link", url: i.shareUrl },
      receiptRows(i.receipt, i.timeZone),
      { kind: "fine", text: "Bids are final. Questions? Just reply to this email." },
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
  const standing = `${first} is #${i.rank} on ${day} with ${formatUsd(i.totalCents)}.`;
  return {
    subject: `Your ${amount} boost for ${first} is in`,
    preheader: standing,
    kicker: `You boosted ${first}`,
    title: `+${amount}`,
    ...colors(i.theme),
    blocks: [
      { kind: "person", name: i.name, line: `${formatUsd(i.totalCents)} · #${i.rank} on ${day}`, photoUrl: i.photoUrl },
      { kind: "p", text: `Nice one. ${standing}${i.alertOptIn ? ` We'll email you if ${first} gets passed.` : ""}` },
      { kind: "button", label: `Share ${first}'s day`, url: i.dateUrl },
      receiptRows(i.receipt, i.timeZone),
      { kind: "fine", text: `Boosts are final and paid to bday.lol, not to ${first}. Gifts still go straight to them.` },
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
  newTop: { name: string; totalCents: number };
  /** The latest amount needed to take #1 back. */
  amountCents: number;
  /** Their total and rank right now (the email can go out up to 15 min after they were passed). */
  totalCents: number;
  rank: number;
  /** The day being fought over is today: it ends at midnight ET. */
  isToday: boolean;
  boostUrl: string;
};

export function outbidAlertEmail(i: OutbidAlertInput): EmailContent {
  const first = firstName(i.name);
  const day = formatLong(i.md);
  const amount = formatUsd(i.amountCents);
  const who = i.isOwner ? "You" : first;
  const newTop = firstName(i.newTop.name);
  return {
    subject: `${i.isOwner ? "You" : first} got passed on ${day}`,
    preheader: `${newTop} has ${formatUsd(i.newTop.totalCents)}. ${amount} takes #1 back.`,
    kicker: `${who} got passed on`,
    title: day,
    ...colors(i.theme),
    blocks: [
      {
        kind: "rows",
        strong: true,
        rows: [
          [`#1 ${i.newTop.name}`, formatUsd(i.newTop.totalCents)],
          [`#${i.rank} ${i.isOwner ? "You" : i.name}`, formatUsd(i.totalCents)],
        ],
      },
      {
        kind: "bar",
        title: `Take #1 back for ${amount}`,
        sub: i.isToday ? `${day} ends at midnight ET.` : undefined,
        label: `Boost ${amount}`,
        url: i.boostUrl,
      },
      { kind: "fine", text: "Getting outbid is part of the game. Boosts add to the total and are final." },
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
  const open = i.topTotalCents === null;
  const state = open ? `Nobody has claimed it yet.` : `The top bid is ${formatUsd(i.topTotalCents!)}.`;
  return {
    subject: again ? `Claim ${day} again` : `${day} is in a week`,
    preheader: again
      ? `It's a week away and the board starts fresh. ${state}`
      : `Claim it before someone else does. ${state}`,
    kicker: again ? "It's back in a week" : "One week to go",
    title: day,
    blocks: [
      {
        kind: "p",
        text: again
          ? `Last year you claimed ${day}. Every year starts fresh, so it's up for grabs again.`
          : "Claim your birthday before someone else does. The highest bid gets the bday.lol homepage all day.",
      },
      { kind: "bar", title: `Own ${day} for ${formatUsd(i.minCents)}`, sub: state, label: `Claim ${day}`, url: i.claimUrl },
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
  const where = i.rank === 1 ? "You're on the bday.lol homepage today." : `You're #${i.rank} on today's list.`;
  const gifts = i.hasGiftLinks
    ? "Your gift buttons are live, so share your link and let people celebrate you."
    : "Share your link so everyone knows it's your day.";
  return {
    subject: `Happy birthday, ${first}! 🎂`,
    preheader: `${where} ${i.hasGiftLinks ? "Your gift buttons are live." : ""}`.trim(),
    kicker: `Happy birthday, ${first}`,
    title: day,
    ...colors(i.theme),
    blocks: [
      { kind: "person", name: i.name, line: `${formatUsd(i.totalCents)} · #${i.rank} today`, photoUrl: i.photoUrl },
      { kind: "p", text: `${where} ${gifts}` },
      { kind: "button", label: "Share your link", url: i.dateUrl },
    ],
    reason: `You're getting this because you're on ${possessive(i.md)} birthday list on bday.lol.`,
  };
}

// ---------------------------------------------------------------------------
// 6. "You got boosted" (bundled about once an hour)
// ---------------------------------------------------------------------------

export type BoostDigestInput = Person & {
  md: MonthDay;
  /** Each boost since the last digest, oldest first. Who boosted is never shown. */
  boosts: Array<{ amountCents: number; at: Date }>;
  totalCents: number;
  rank: number;
  dateUrl: string;
  timeZone: string;
};

export function boostDigestEmail(i: BoostDigestInput): EmailContent {
  const day = formatLong(i.md);
  const added = i.boosts.reduce((sum, b) => sum + b.amountCents, 0);
  const count = i.boosts.length;
  const time = (d: Date) => d.toLocaleTimeString("en-US", { timeZone: i.timeZone, hour: "numeric", minute: "2-digit" });
  return {
    subject:
      count === 1 ? `Someone boosted you +${formatUsd(added)}` : `${count} people boosted you +${formatUsd(added)}`,
    preheader: `You're #${i.rank} on ${day} with ${formatUsd(i.totalCents)}.`,
    kicker: count === 1 ? "Someone boosted you" : `${count} boosts for you`,
    title: `+${formatUsd(added)}`,
    ...colors(i.theme),
    blocks: [
      { kind: "person", name: i.name, line: `${formatUsd(i.totalCents)} · #${i.rank} on ${day}`, photoUrl: i.photoUrl },
      { kind: "rows", strong: true, rows: i.boosts.map((b) => [`${time(b.at)} ET`, `+${formatUsd(b.amountCents)}`] as [string, string]) },
      { kind: "button", label: "Share your link", url: i.dateUrl },
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
    subject: `New claim: ${i.name}, ${formatShort(i.md)}, ${formatUsd(i.amountCents)}`,
    preheader: `#${i.rank} on ${day}, ${i.year}. Check the photo, name and bio.`,
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
      { kind: "fine", text: "Offensive photo, name or bio? Remove it from the admin view." },
    ],
    reason: "You're getting this because you're the bday.lol admin.",
  };
}
