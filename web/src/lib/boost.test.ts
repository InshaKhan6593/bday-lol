import { describe, expect, it } from "vitest";
import { boostedText, boostReturnPath, parseBoostLink } from "./boost";
import { boostCheckoutParams } from "./checkout";
import { endingSoonText } from "./countdown";
import { routes } from "./routes";

const NOW = new Date("2026-10-07T12:00:00-04:00");
const metadata = { kind: "boost" as const, paymentId: "pay-9", entryId: "ent-9", boardId: "brd-9" };

describe("boost checkout session", () => {
  const params = boostCheckoutParams({
    name: "Jess Moreno",
    amountCents: 1_600,
    metadata,
    origin: "https://mybday.lol",
    returnPath: "/october-7",
    now: NOW,
  });

  it("charges the boost in USD with Adaptive Pricing", () => {
    expect(params.mode).toBe("payment");
    expect(params.adaptive_pricing).toEqual({ enabled: true });
    expect(params.line_items).toEqual([
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 1_600,
          product_data: {
            name: "Boost Jess Moreno on mybday.lol",
            description: "Boosts are final and add to Jess's total. They're paid to mybday.lol, not to Jess.",
          },
        },
      },
    ]);
  });

  it("lets Stripe collect the booster's email and tags the session with our ids (07 B8)", () => {
    expect(params.customer_email).toBeUndefined();
    expect(params.metadata).toEqual(metadata);
    expect(params.payment_intent_data).toEqual({ metadata });
    expect(params.expires_at).toBe(Math.floor(NOW.getTime() / 1000) + 1_800);
  });

  it("returns to the page the box was opened on", () => {
    expect(params.success_url).toBe("https://mybday.lol/october-7?boosted={CHECKOUT_SESSION_ID}");
    expect(params.cancel_url).toBe("https://mybday.lol/october-7");
  });
});

describe("boost return path", () => {
  it("allows the homepage and real date pages", () => {
    expect(boostReturnPath("/")).toBe("/");
    expect(boostReturnPath("/october-7")).toBe("/october-7");
    expect(boostReturnPath("/february-29")).toBe("/february-29");
  });

  it("falls back to the homepage for anything else (no open redirects)", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/october-32", "/claim", "/october-7?x=1", "", null, 7]) {
      expect(boostReturnPath(bad), String(bad)).toBe("/");
    }
  });
});

describe("boost notes and links", () => {
  it("thanks the booster with the new standing", () => {
    expect(boostedText({ name: "Jess Moreno", amountCents: 500, rank: 1, totalCents: 24_500 })).toBe(
      "Thanks! Your $5 boost is in. Jess is #1 with $245.",
    );
    expect(boostedText({ name: "Ana Reyes", amountCents: 2_000, rank: 2, totalCents: 17_000 })).toBe(
      "Thanks! Your $20 boost is in. Ana is now #2 with $170.",
    );
  });

  it("builds the email's 'Boost to take #1 back' link and reads it back", () => {
    const link = routes.boostLink({ month: 10, day: 7 }, "abc123XYZ_", 1_600);
    expect(link).toBe("/october-7?boost=abc123XYZ_&amount=16");
    expect(parseBoostLink({ boost: "abc123XYZ_", amount: "16" }, 200)).toEqual({ publicId: "abc123XYZ_", amountCents: 1_600 });
  });

  it("never prefills less than the minimum boost, and ignores broken links", () => {
    expect(parseBoostLink({ boost: "abc123XYZ_", amount: "1" }, 200)).toEqual({ publicId: "abc123XYZ_", amountCents: 200 });
    expect(parseBoostLink({ boost: "abc123XYZ_" }, 200)).toEqual({ publicId: "abc123XYZ_", amountCents: 200 });
    expect(parseBoostLink({ boost: "<script>", amount: "16" }, 200)).toBeNull();
    expect(parseBoostLink({ boost: ["a", "b"], amount: "16" }, 200)).toBeNull();
    expect(parseBoostLink({}, 200)).toBeNull();
  });
});

describe("today ends soon (07 B5)", () => {
  const min = 60_000;

  it("warns only in the last 30 minutes", () => {
    expect(endingSoonText(31 * min)).toBeNull();
    expect(endingSoonText(30 * min)).toBe("Today ends in 30 min. Finish paying before midnight ET.");
    expect(endingSoonText(11 * min + 1)).toBe("Today ends in 12 min. Finish paying before midnight ET.");
    expect(endingSoonText(45_000)).toBe("Today ends in less than a minute. Finish paying before midnight ET.");
    expect(endingSoonText(0)).toBeNull();
  });
});
