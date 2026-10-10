import { describe, expect, it } from "vitest";
import { escapeHtml, formatMinorUnits, renderEmail } from "./email-render";
import { sampleEmails } from "./email-samples";
import {
  adminClaimEmail,
  boardWindow,
  type BoardRow,
  claimConfirmationEmail,
  outbidAlertEmail,
  receiptNumber,
  reminderEmail,
  yourDayEmail,
} from "./email-templates";

const ORIGIN = "https://mybday.lol";
const md = { month: 10, day: 7 };

describe("email rendering", () => {
  it("escapes everything users type, in HTML", () => {
    expect(escapeHtml(`<img src=x onerror="alert('hi')">&`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;hi&#39;)&quot;&gt;&amp;",
    );
    const email = renderEmail(
      {
        subject: "Hi",
        preheader: "p",
        kicker: "k",
        title: "t",
        blocks: [{ kind: "person", name: "<script>alert(1)</script>", line: "x" }],
        reason: "r",
      },
      { origin: ORIGIN },
    );
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("pads the preview line so inboxes don't show the body after it, and links the site's FAQ, Terms and Privacy", () => {
    const email = renderEmail(sampleEmails(ORIGIN)[0]!.content, { origin: ORIGIN });
    expect(email.html).toMatch(/You&#39;re on the homepage with \$241\.(&#847;&zwnj;&nbsp;){90}<\/div>/);
    for (const path of ["/how-it-works", "/terms", "/privacy"]) expect(email.html).toContain(`href="${ORIGIN}${path}"`);
    expect(email.text).toContain(`Terms: ${ORIGIN}/terms`);
  });

  it("only links to http(s) addresses", () => {
    const email = renderEmail(
      {
        subject: "s",
        preheader: "p",
        kicker: "k",
        title: "t",
        blocks: [{ kind: "button", label: "Go", url: "javascript:alert(1)" }],
        reason: "r",
      },
      { origin: ORIGIN },
    );
    expect(email.html).not.toContain("javascript:");
    expect(email.html).toContain('href="#"');
  });

  it("uses the person's colors and falls back to Butter", () => {
    const base = { subject: "s", preheader: "p", kicker: "k", title: "t", blocks: [], reason: "r" };
    expect(renderEmail({ ...base, ground: "#BFD8FF" }, { origin: ORIGIN }).html).toContain("background:#BFD8FF");
    expect(renderEmail({ ...base, ground: "red;x:y" }, { origin: ORIGIN }).html).toContain("background:#FFEC94");
  });

  it("adds the unsubscribe link and postal address only when given", () => {
    const base = { subject: "s", preheader: "p", kicker: "k", title: "t", blocks: [], reason: "Because." };
    const plain = renderEmail(base, { origin: ORIGIN });
    expect(plain.html).not.toContain("Unsubscribe");
    const full = renderEmail(base, { origin: ORIGIN, unsubscribeUrl: `${ORIGIN}/unsubscribe?t=1`, footerAddress: "1 Main St" });
    expect(full.html).toContain("Unsubscribe");
    expect(full.text).toContain(`Unsubscribe: ${ORIGIN}/unsubscribe?t=1`);
    expect(full.text).toContain("1 Main St");
  });

  it("formats what the payer saw in their own currency", () => {
    expect(formatMinorUnits(143_994, "pkr")).toBe("PKR 1,439.94");
    expect(formatMinorUnits(19_200, "GBP")).toBe("GBP 192.00");
    // Yen has no minor unit.
    expect(formatMinorUnits(3_600, "jpy")).toBe("JPY 3,600");
  });

  it("renders all 8 emails with a subject, HTML and matching plain text", () => {
    const emails = sampleEmails(ORIGIN);
    expect(emails.length).toBeGreaterThanOrEqual(8);
    for (const { content } of emails) {
      const email = renderEmail(content, { origin: ORIGIN });
      expect(email.subject).toBe(content.subject);
      expect(email.html).toContain(escapeHtml(content.title));
      expect(email.text).toContain(content.title);
      expect(email.text).toContain(content.reason);
    }
  });
});

/** A board for the mini leaderboard: names in rank order, $ totals; `you` is marked. */
function demoBoard(people: Array<[string, number]>, you: string): BoardRow[] {
  return people.map(([name, usd], i) => ({ rank: i + 1, name, totalCents: usd * 100, theme: "sky", photoUrl: null, isYou: name === you }));
}

describe("mini leaderboard", () => {
  const rows = Array.from({ length: 34 }, (_, i) => ({ rank: i + 1 }));
  const ranks = (yours: number) => boardWindow(rows, yours).map((r) => (r === "gap" ? "…" : r.rank));

  it("shows #1, the row above you, you and the row below, like a league table", () => {
    expect(ranks(1)).toEqual([1, 2, 3]);
    expect(ranks(2)).toEqual([1, 2, 3]);
    expect(ranks(3)).toEqual([1, 2, 3, 4]);
    expect(ranks(7)).toEqual([1, "…", 6, 7, 8]);
    expect(ranks(34)).toEqual([1, "…", 33, 34]);
  });

  it("copes with tiny boards", () => {
    expect(boardWindow([{ rank: 1 }], 1)).toEqual([{ rank: 1 }]);
    expect(boardWindow([{ rank: 1 }, { rank: 2 }], 2)).toEqual([{ rank: 1 }, { rank: 2 }]);
  });
});

describe("email wording", () => {
  const receipt = { amountCents: 24_100, presentment: null, paidAt: new Date("2026-10-07T18:40:00Z"), reference: null, item: "Claim", number: "MB-4F7K2A9C", method: null };
  const person = { name: "Sam Rivera", bio: "", photoUrl: null, theme: "sky" as const };

  it("has exactly one button in every email", () => {
    for (const { label, content } of sampleEmails(ORIGIN)) {
      expect(content.blocks.filter((b) => b.kind === "button"), label).toHaveLength(1);
    }
  });

  it("keeps every subject short enough for a phone inbox (~50 characters)", () => {
    for (const { content } of sampleEmails(ORIGIN)) {
      expect(content.subject.length, content.subject).toBeLessThanOrEqual(50);
      // The preview line adds something; it never just repeats the subject.
      expect(content.preheader).not.toBe(content.subject);
    }
  });

  it("claim confirmation: today's #1, a later date's #1, and a lower rank (07 B1, B6)", () => {
    const base = { ...person, md, year: 2026, currentYear: 2026, totalCents: 24_100, shareUrl: `${ORIGIN}/october-7`, receipt, timeZone: "America/New_York", board: demoBoard([["Sam Rivera", 241], ["Jess Moreno", 240]], "Sam Rivera") };
    const today = claimConfirmationEmail({ ...base, rank: 1, toTopCents: null, isToday: true });
    expect(today.subject).toBe("October 7 is yours. For now.");
    expect(today.preheader).toBe("You're on the homepage with $241.");
    expect(today.kicker).toBe("You're on the homepage");

    const later = claimConfirmationEmail({ ...base, md: { month: 10, day: 1 }, year: 2027, rank: 1, toTopCents: null, isToday: false });
    expect(later.subject).toBe("October 1, 2027 is yours. For now.");

    const third = claimConfirmationEmail({ ...base, rank: 3, toTopCents: 9_100, isToday: true });
    expect(third.subject).toBe("You're #3 on October 7");
    expect(third.preheader).toBe("$91 more takes #1. Friends and followers can boost you from your spot.");
    // Lower ranks don't get the outbid promise (alerts only fire on losing #1).
    expect(JSON.stringify(third.blocks)).not.toContain("we'll email you right away");
    // One button per email.
    expect(third.blocks.filter((b) => b.kind === "button")).toHaveLength(1);
  });

  it("claim receipt: one line, a total, and the payment details", () => {
    const base = {
      ...person,
      md,
      year: 2026,
      currentYear: 2026,
      totalCents: 24_100,
      shareUrl: `${ORIGIN}/october-7`,
      timeZone: "America/New_York",
      board: demoBoard([["Sam Rivera", 241]], "Sam Rivera"),
    };
    const paid = { ...receipt, amountCents: 24_100, method: "Visa •••• 4242", presentment: { currency: "gbp", amount: 19_200 } };
    const email = claimConfirmationEmail({ ...base, rank: 1, toTopCents: null, isToday: true, receipt: paid });
    expect(email.blocks).toContainEqual({
      kind: "receipt",
      title: "Receipt",
      number: "MB-4F7K2A9C",
      lines: [{ label: "Claim · October 7, 2026", note: "Your spot on the birthday board", amount: "$241" }],
      total: { label: "Total paid", amount: "$241" },
      details: [
        ["Paid on", "Oct 7, 2026"],
        ["Payment", "Visa •••• 4242"],
        ["Charged", "GBP 192.00"],
      ],
    });
    // Paid in dollars, card unknown: just the date.
    const plain = claimConfirmationEmail({ ...base, rank: 1, toTopCents: null, isToday: true, receipt });
    expect(plain.blocks.find((b) => b.kind === "receipt")).toMatchObject({ details: [["Paid on", "Oct 7, 2026"]] });
  });

  it("receipt numbers are short and stable", () => {
    expect(receiptNumber("4f7k2a9c-1111-2222-3333-444455556666")).toBe("MB-4F7K2A9C");
  });

  it("outbid alert shows who's #1, what you have, and the amount that wins it back", () => {
    const base = {
      ...person,
      name: "Jess Moreno",
      md,
      newTop: { name: "Tyler Brooks", totalCents: 24_100 },
      amountCents: 200,
      totalCents: 24_000,
      rank: 2,
      isToday: true,
      boostUrl: `${ORIGIN}/october-7?boost=x&amount=2`,
      board: demoBoard([["Tyler Brooks", 241], ["Jess Moreno", 240], ["Ana Reyes", 150]], "Jess Moreno"),
    };
    // Like auction outbid alerts: who's on top, where you are, what wins it back, when it closes, one button.
    const owner = outbidAlertEmail({ ...base, isOwner: true });
    expect(owner.subject).toBe("You've been outbid on October 7");
    expect(owner.preheader).toBe("Tyler has $241. $2 takes #1 back.");
    expect(owner.blocks).toEqual([
      {
        kind: "board",
        title: "October 7 board",
        rows: [
          { rank: 1, name: "Tyler Brooks", amount: "$241", color: "#BFD8FF", photoUrl: null, badge: "New #1" },
          { rank: 2, name: "Jess Moreno", amount: "$240", color: "#BFD8FF", photoUrl: null, highlight: true, badge: "You", note: "Was #1" },
          { rank: 3, name: "Ana Reyes", amount: "$150", color: "#BFD8FF", photoUrl: null },
        ],
      },
      { kind: "callout", title: "$2 takes #1 back", sub: "Bidding on October 7 closes tonight at midnight ET." },
      { kind: "button", label: "Boost $2 and retake #1", url: base.boostUrl },
      { kind: "fine", text: "Getting outbid is part of the game. Boosts add to the total and are final." },
    ]);
    const later = outbidAlertEmail({ ...base, isOwner: true, isToday: false });
    expect(later.blocks).toContainEqual({
      kind: "callout",
      title: "$2 takes #1 back",
      sub: "Bidding stays open until October 7 ends at midnight ET.",
    });

    const fan = outbidAlertEmail({ ...base, isOwner: false });
    expect(fan.subject).toBe("Jess was outbid on October 7");
    // A fan's email highlights Jess without calling her "You".
    expect(JSON.stringify(fan.blocks)).not.toContain('"badge":"You"');
    expect(fan.blocks).toContainEqual({ kind: "callout", title: "$2 puts Jess back on top", sub: "Bidding on October 7 closes tonight at midnight ET." });
    expect(fan.reason).toBe("You're getting this because you asked us to email you if Jess gets passed.");
  });

  it("reminder vs. yearly re-claim", () => {
    const signup = reminderEmail({ md, source: "signup", topTotalCents: null, minCents: 500, claimUrl: `${ORIGIN}/claim?date=october-7` });
    expect(signup.subject).toBe("October 7 is in a week");
    expect(signup.preheader).toBe("Claim it before someone else does. Nobody has claimed it yet.");
    const again = reminderEmail({ md, source: "claim", topTotalCents: 4_000, minCents: 4_100, claimUrl: `${ORIGIN}/claim?date=october-7` });
    expect(again.subject).toBe("Claim October 7 again");
    expect(again.preheader).toBe("It's a week away and the board starts fresh. The top bid is $40.");
    // A big line with the price, then one button (no black bar inside the card any more).
    expect(signup.blocks).toContainEqual({ kind: "callout", title: "$5 makes it yours", sub: "Nobody has claimed it yet." });
    expect(again.blocks).toContainEqual({ kind: "callout", title: "$41 takes the top spot", sub: "The top bid right now is $40." });
    expect(again.blocks).toContainEqual({ kind: "button", label: "Claim October 7", url: `${ORIGIN}/claim?date=october-7` });
  });

  it("your day is here: talks to the parent about a child, and never mentions gifts (07 D4)", () => {
    const base = {
      ...person,
      md,
      totalCents: 4_000,
      hasGiftLinks: false,
      dateUrl: `${ORIGIN}/october-7/maya`,
      board: demoBoard([["Jess Moreno", 240], ["Ana Reyes", 150], ["Maya", 40]], "Maya"),
    };
    const child = yourDayEmail({ ...base, name: "Maya", rank: 3, isMinor: true });
    expect(child.subject).toBe("Happy birthday to Maya! 🎂");
    expect(child.preheader).toBe("Maya is #3 on today's board.");
    expect(child.blocks).toContainEqual({ kind: "p", text: "Share the link so family and friends can celebrate with Maya." });
    expect(child.reason).toBe("You're getting this because you added Maya to October 7's birthday board on mybday.lol.");
    expect(JSON.stringify(child).toLowerCase()).not.toContain("gift");
    expect(yourDayEmail({ ...base, name: "Maya", rank: 1, isMinor: true }).preheader).toBe(
      "Maya is on the mybday.lol homepage today.",
    );

    const adult = yourDayEmail({ ...base, rank: 1, hasGiftLinks: true, isMinor: false });
    expect(adult.subject).toBe("Happy birthday, Sam! 🎂");
    expect(adult.preheader).toBe("You're on the mybday.lol homepage today. Your gift buttons are live.");
  });

  it("admin alert flags a child's listing", () => {
    const base = { ...person, md, year: 2026, amountCents: 4_000, rank: 3, email: "mom@example.com", giftLinks: [], number: "MB-0C5D8E21", dateUrl: `${ORIGIN}/october-7` };
    const child = adminClaimEmail({ ...base, name: "Maya", isMinor: true });
    expect(child.subject).toBe("New child claim: Maya, Oct 7, $40");
    expect(child.preheader).toBe("#3 on October 7, 2026. A child's listing: check it's a first name only and the photo is OK.");
    expect(JSON.stringify(child.blocks)).toContain("Child (under 18), added by a parent");

    const adult = adminClaimEmail({ ...base, isMinor: false });
    expect(adult.subject).toBe("New claim: Sam Rivera, Oct 7, $40");
    expect(JSON.stringify(adult.blocks)).not.toContain("Child");
  });
});
