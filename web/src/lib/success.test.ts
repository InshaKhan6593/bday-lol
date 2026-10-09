import { describe, expect, it } from "vitest";
import { isCheckoutSessionId, linkCardKicker, successCopy, type Placement } from "./success";

const base: Placement = {
  md: { month: 10, day: 7 },
  year: 2026,
  rank: 1,
  when: "today",
  currentYear: 2026,
  toTopCents: null,
};

describe("success copy", () => {
  it("uses the mockup copy for today's #1", () => {
    expect(successCopy(base)).toEqual({
      kicker: "You're on the homepage",
      title: ["October 7 is yours.", "For now."],
      sub: "Share it so everyone knows it's your day.",
      note: "If someone outbids you, we'll email you right away so you can bid back. Either way, you stay on October 7's birthday list.",
      link: { label: "See the homepage", to: "home" },
    });
  });

  it("says #1 for a later date, with the year when it's next year (07 B1)", () => {
    const soon = successCopy({ ...base, md: { month: 10, day: 12 }, when: "upcoming" });
    expect(soon.kicker).toBe("You're #1 for October 12");
    expect(soon.title).toEqual(["October 12 is yours.", "For now."]);
    expect(soon.link).toEqual({ label: "See October 12's list", to: "date" });

    const nextYear = successCopy({ ...base, md: { month: 10, day: 1 }, year: 2027, when: "upcoming" });
    expect(nextYear.kicker).toBe("You're #1 for October 1, 2027");
  });

  it("shows the real rank and what it takes to reach #1 (07 B1, B6)", () => {
    const copy = successCopy({ ...base, rank: 3, toTopCents: 1_600 });
    expect(copy.kicker).toBe("You're on the list");
    expect(copy.title).toEqual(["You're #3 on October 7."]);
    expect(copy.sub).toBe("$16 more takes #1. Share it so friends can boost you.");
    // Outbid emails only fire when someone loses #1, so no promise here.
    expect(copy.note).toBe(
      "You stay on October 7's birthday list, where friends can find you, boost you and send gifts.",
    );
    expect(copy.link).toEqual({ label: "See October 7's list", to: "date" });
  });

  it("drops the #1 nudge once the day has ended", () => {
    const copy = successCopy({ ...base, rank: 1, when: "closed" });
    expect(copy.title).toEqual(["You're #1 on October 7."]);
    expect(copy.sub).toBe("Share it so everyone knows it's your day.");
    expect(successCopy({ ...base, rank: 2, when: "closed", toTopCents: 200 }).sub).not.toContain("more takes #1");
  });

  it("labels the link card", () => {
    expect(linkCardKicker(true)).toBe("Today's birthday");
    expect(linkCardKicker(false)).toBe("Top bid");
  });
});

describe("checkout session ids", () => {
  it("accepts Stripe's format only", () => {
    expect(isCheckoutSessionId("cs_test_a1B2c3D4e5F6g7H8")).toBe(true);
    expect(isCheckoutSessionId("cs_live_a1B2c3D4e5F6g7H8")).toBe(true);
    expect(isCheckoutSessionId("{CHECKOUT_SESSION_ID}")).toBe(false);
    expect(isCheckoutSessionId("cs_test_x; drop table payments")).toBe(false);
    expect(isCheckoutSessionId(["cs_test_a1B2c3D4e5F6g7H8"])).toBe(false);
    expect(isCheckoutSessionId(undefined)).toBe(false);
  });
});
