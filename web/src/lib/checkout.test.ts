import { describe, expect, it } from "vitest";
import { CHECKOUT_TTL_SECONDS, claimCheckoutParams, readCheckoutMetadata, sniffImage } from "./checkout";

const metadata = { kind: "claim" as const, paymentId: "pay-1", entryId: "ent-1", boardId: "brd-1" };
const NOW = new Date("2026-10-07T12:00:00-04:00");

function params() {
  return claimCheckoutParams({
    md: { month: 10, day: 1 },
    year: 2027,
    amountCents: 24_100,
    email: "sam@example.com",
    metadata,
    origin: "https://bday.lol",
    cancelPath: "/claim?date=october-1&rank=2",
    now: NOW,
  });
}

describe("claim checkout session", () => {
  it("charges the bid in USD with Adaptive Pricing", () => {
    const p = params();
    expect(p.mode).toBe("payment");
    expect(p.adaptive_pricing).toEqual({ enabled: true });
    expect(p.line_items).toEqual([
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 24_100,
          product_data: {
            name: "Claim October 1, 2027 on bday.lol",
            description: "Bids are final. If someone outbids you, you stay on this day's birthday list.",
          },
        },
      },
    ]);
  });

  it("uses the form email and tags the session and payment with our ids", () => {
    const p = params();
    expect(p.customer_email).toBe("sam@example.com");
    expect(p.client_reference_id).toBe("pay-1");
    expect(p.metadata).toEqual(metadata);
    expect(p.payment_intent_data).toEqual({ metadata });
  });

  it("expires after 30 minutes (07 B5)", () => {
    expect(CHECKOUT_TTL_SECONDS).toBe(1_800);
    expect(params().expires_at).toBe(Math.floor(NOW.getTime() / 1000) + 1_800);
  });

  it("returns to the Success page with Stripe's placeholder left unencoded", () => {
    const p = params();
    expect(p.success_url).toBe("https://bday.lol/claim/success?session_id={CHECKOUT_SESSION_ID}");
    expect(p.cancel_url).toBe("https://bday.lol/claim?date=october-1&rank=2");
  });

  it("reads our metadata back and ignores sessions this app didn't create", () => {
    expect(readCheckoutMetadata({ ...metadata })).toEqual(metadata);
    expect(readCheckoutMetadata({ ...metadata, kind: "boost" })).toEqual({ ...metadata, kind: "boost" });
    expect(readCheckoutMetadata({ ...metadata, kind: "donation" })).toBeNull();
    expect(readCheckoutMetadata({ kind: "claim", paymentId: "pay-1" })).toBeNull();
    expect(readCheckoutMetadata(null)).toBeNull();
  });
});

describe("photo type check", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, 0, 0, 0, 0, 0, 0, 0, 0]);

  it("knows JPEG, PNG and WebP by their first bytes", () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpg");
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
    expect(sniffImage(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("webp");
  });

  it("rejects anything else, whatever its name says", () => {
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("GIF89a......"))).toBeNull();
    expect(sniffImage(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});
