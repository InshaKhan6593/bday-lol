import type { BoardTypeSettings } from "@/config/board-types";
import { formatUsd } from "./money";

/** The money rules the How it works copy quotes ("Bids start at $5", "Boosts start at $2"). */
type CopyRules = Pick<BoardTypeSettings, "minOpenBidCents" | "minStepCents" | "minBoostCents">;

export type Step = { title: string; body: string };
export type Faq = { q: string; a: string };

/** How it works wording, verbatim from How.dc.html (the homepage has its own, decided 07 A5). */
export function howItWorksSteps(rules: CopyRules): Step[] {
  return [
    {
      title: "Place a bid on your birthday",
      body: `Let everyone know it's your day, and make it easy for them to celebrate you. Bids start at ${formatUsd(rules.minOpenBidCents)}.`,
    },
    {
      title: "Highest bid owns the homepage",
      body: "Anyone can take #1 with a higher bid, even on the day. If you're passed, you keep your spot on the board.",
    },
    {
      title: "Get birthday gifts sent your way",
      body: "Friends and followers send gifts straight to your Venmo, Cash App, Amazon, or Throne wishlist.",
    },
  ];
}

/** The 10 questions, verbatim from the mockup. Amounts come from the board settings so the copy can't drift from the rules. */
export function howItWorksFaq(rules: CopyRules): Faq[] {
  const openBid = formatUsd(rules.minOpenBidCents);
  const step = formatUsd(rules.minStepCents);
  const boost = formatUsd(rules.minBoostCents);
  return [
    {
      q: "What happens if someone outbids me?",
      a: "They get the homepage and you move down to that date's birthday board, where people can still find you and send gifts. We email you right away so you can bid back.",
    },
    {
      q: "Are bids refundable?",
      a: "No. A bid buys you a spot on that date's board, and the homepage while you are the top bid. Getting outbid is part of the game.",
    },
    {
      q: "When does a day start and end?",
      a: "Midnight to midnight, Eastern Time. The countdown on the homepage always shows how long is left.",
    },
    {
      q: "How do gifts work?",
      a: "When you claim a date, you add a link to your Venmo, Cash App, Amazon, or Throne wishlist. On your birthday, anyone can tap a button next to your name on the board to send you money or buy something off your wishlist. mybday.lol never touches it.",
    },
    {
      q: "Can I claim a birthday for someone else?",
      a: "Yes. Use their name and photo. Add their Venmo, Cash App, Amazon, or Throne wishlist so gifts go straight to them. If they’re under 18, only a parent or guardian can add them, using their first name only and no gift links.",
    },
    {
      q: "Do I have to prove it is my birthday?",
      a: "No. You are claiming the date, not proving it.",
    },
    {
      q: "What is the minimum bid?",
      a: `${openBid} for an open date. To pass anyone on the board, bid at least ${step} more than they did.`,
    },
    {
      q: "Can I raise my bid, or help a friend?",
      a: `Yes. Tap the ▲ next to anyone’s total to boost it, including your own. Boosts start at ${boost}, add to that person’s total, and are final. Boosts are paid to mybday.lol, not to the birthday person.`,
    },
    {
      q: "Can I use mybday.lol outside the US?",
      a: "Yes. mybday.lol works worldwide, and you pay in your local currency at checkout. For gifts outside the US, Throne works best, since Venmo and Cash App are mostly US-only.",
    },
    {
      q: "Is my email shown anywhere?",
      a: "Never. We only use it for receipts and outbid alerts.",
    },
  ];
}

/** schema.org FAQPage structured data, so search engines can read the questions. */
export function faqJsonLd(faq: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

/** JSON for an inline <script type="application/ld+json">, with "<" escaped so text can never close the tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
