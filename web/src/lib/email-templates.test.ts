import { describe, expect, it } from "vitest";
import { escapeHtml, formatMinorUnits, renderEmail } from "./email-render";
import { sampleEmails } from "./email-samples";
import { claimConfirmationEmail, outbidAlertEmail, reminderEmail } from "./email-templates";

const ORIGIN = "https://bday.lol";
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

describe("email wording", () => {
  const receipt = { amountCents: 24_100, presentment: null, paidAt: new Date("2026-10-07T18:40:00Z"), reference: null, item: "Claim" };
  const person = { name: "Sam Rivera", bio: "", photoUrl: null, theme: "sky" as const };

  it("claim confirmation: today's #1, a later date's #1, and a lower rank (07 B1, B6)", () => {
    const base = { ...person, md, year: 2026, currentYear: 2026, totalCents: 24_100, shareUrl: `${ORIGIN}/october-7`, receipt, timeZone: "America/New_York" };
    const today = claimConfirmationEmail({ ...base, rank: 1, toTopCents: null, isToday: true });
    expect(today.subject).toBe("You're on the homepage: October 7 is yours");
    expect(today.kicker).toBe("You're on the homepage");

    const later = claimConfirmationEmail({ ...base, md: { month: 10, day: 1 }, year: 2027, rank: 1, toTopCents: null, isToday: false });
    expect(later.subject).toBe("October 1, 2027 is yours (for now)");

    const third = claimConfirmationEmail({ ...base, rank: 3, toTopCents: 9_100, isToday: true });
    expect(third.subject).toBe("You're #3 on October 7");
    expect(third.preheader).toBe(
      "Someone got there first, so you're #3. $91 more takes #1, and friends can boost you from your date's page.",
    );
    // Lower ranks don't get the outbid promise (alerts only fire on losing #1).
    expect(JSON.stringify(third.blocks)).not.toContain("we'll email you right away");
  });

  it("outbid alert speaks to the person passed, or to a fan", () => {
    const base = { ...person, name: "Jess Moreno", md, newTopName: "Tyler Brooks", amountCents: 200, totalCents: 24_000, rank: 2, boostUrl: `${ORIGIN}/october-7?boost=x&amount=2` };
    expect(outbidAlertEmail({ ...base, isOwner: true }).subject).toBe("You just got passed on October 7");
    const fan = outbidAlertEmail({ ...base, isOwner: false });
    expect(fan.subject).toBe("Jess just got passed on October 7");
    expect(fan.reason).toBe("You're getting this because you asked us to email you if Jess gets passed.");
    expect(fan.blocks).toContainEqual({
      kind: "bar",
      title: "Take #1 back for $2",
      sub: "Boosts add to the total and are final.",
      label: "Boost $2",
      url: base.boostUrl,
    });
  });

  it("reminder vs. yearly re-claim", () => {
    const signup = reminderEmail({ md, source: "signup", topTotalCents: null, minCents: 500, claimUrl: `${ORIGIN}/claim?date=october-7` });
    expect(signup.subject).toBe("Your birthday is a week away: claim October 7 first");
    expect(signup.preheader).toBe("Nobody has claimed it yet. Bids start at $5.");
    const again = reminderEmail({ md, source: "claim", topTotalCents: 4_000, minCents: 4_100, claimUrl: `${ORIGIN}/claim?date=october-7` });
    expect(again.subject).toBe("Claim October 7 again: it's a week away");
    expect(again.preheader).toBe("The top bid is $40 right now.");
  });
});
