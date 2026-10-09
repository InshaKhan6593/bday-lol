import { describe, expect, it } from "vitest";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { faqJsonLd, howItWorksFaq, howItWorksSteps, jsonLdScript } from "./how-it-works";

const settings = BIRTHDAY_BOARD_TYPE.settings;

describe("how it works copy", () => {
  it("has the mockup's 3 steps, quoting the opening bid", () => {
    const steps = howItWorksSteps(settings);
    expect(steps.map((s) => s.title)).toEqual([
      "Place a bid on your birthday",
      "Highest bid owns the homepage",
      "Get birthday gifts sent your way",
    ]);
    expect(steps[0]?.body).toBe(
      "Let everyone know it's your day, and make it easy for them to celebrate you. Bids start at $5.",
    );
  });

  it("has the mockup's 10 questions in order", () => {
    const faq = howItWorksFaq(settings);
    expect(faq).toHaveLength(10);
    expect(faq[0]?.q).toBe("What happens if someone outbids me?");
    expect(faq[7]?.q).toBe("Can I raise my bid, or help a friend?");
    expect(faq[9]?.q).toBe("Is my email shown anywhere?");
    expect(new Set(faq.map((f) => f.q)).size).toBe(10);
  });

  it("matches the mockup's amounts with the default settings", () => {
    const faq = howItWorksFaq(settings);
    expect(faq[6]?.a).toBe("$5 for an open date. To pass anyone on the list, bid at least $1 more than they did.");
    expect(faq[7]?.a).toBe(
      "Yes. Tap the ▲ next to anyone’s total to boost it, including your own. Boosts start at $2, add to that person’s total, and are final. Boosts are paid to bday.lol, not to the birthday person.",
    );
  });

  it("follows the board settings when the rules change", () => {
    const rules = { minOpenBidCents: 1_000, minStepCents: 500, minBoostCents: 300 };
    expect(howItWorksSteps(rules)[0]?.body).toMatch(/Bids start at \$10\.$/);
    const faq = howItWorksFaq(rules);
    expect(faq[6]?.a).toBe("$10 for an open date. To pass anyone on the list, bid at least $5 more than they did.");
    expect(faq[7]?.a).toContain("Boosts start at $3,");
  });
});

describe("FAQ structured data", () => {
  it("lists every question with its answer", () => {
    const faq = howItWorksFaq(settings);
    const ld = faqJsonLd(faq);
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity).toHaveLength(10);
    expect(ld.mainEntity[2]).toEqual({
      "@type": "Question",
      name: "When does a day start and end?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Midnight to midnight, Eastern Time. The countdown on the homepage always shows how long is left.",
      },
    });
  });

  it("escapes < so the JSON can't close its script tag", () => {
    const out = jsonLdScript({ text: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual({ text: "</script><script>alert(1)</script>" });
  });
});
