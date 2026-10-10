import type Stripe from "stripe";
import { formatLong, type MonthDay } from "./birthday";
import { firstName } from "./people";
import { routes } from "./routes";

/**
 * Stripe Checkout settings for claims and boosts. Pure, so the exact request
 * we send to Stripe is covered by tests.
 */

/** Checkout Sessions expire after 30 min, Stripe's minimum (decided, 07 B5). */
export const CHECKOUT_TTL_SECONDS = 30 * 60;

/** Metadata on every Checkout Session we create. The webhook reads it back. */
export type CheckoutMetadata = {
  kind: "claim" | "boost";
  paymentId: string;
  entryId: string;
  boardId: string;
};

type ClaimCheckoutInput = {
  md: MonthDay;
  /** Board year, shown in the line item ("October 1, 2027"). */
  year: number;
  amountCents: number;
  email: string;
  metadata: CheckoutMetadata;
  /** Site origin, e.g. https://mybday.lol. */
  origin: string;
  /** Where "back" on Stripe's page goes: the Claim page for the same date. */
  cancelPath: string;
  now: Date;
};

/**
 * Stripe's required checkbox under the Pay button (handoff v2 §6, §8): anyone
 * who pays must be 18 or older and accept the Terms and Privacy Policy. The
 * live Stripe account needs its Terms of Service URL set (Settings → Public
 * details) for this to work.
 */
export function termsConsent(origin: string): Pick<Stripe.Checkout.SessionCreateParams, "consent_collection" | "custom_text"> {
  return {
    consent_collection: { terms_of_service: "required" },
    custom_text: {
      terms_of_service_acceptance: {
        message: `I'm 18 or older and agree to the [Terms of Service](${origin}${routes.terms}) and [Privacy Policy](${origin}${routes.privacy})`,
      },
    },
  };
}

/** One-time USD payment with Adaptive Pricing, so people abroad pay in their own currency (settled in USD). */
export function claimCheckoutParams(input: ClaimCheckoutInput): Stripe.Checkout.SessionCreateParams {
  const label = `${formatLong(input.md)}, ${input.year}`;
  return {
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: input.amountCents,
          product_data: {
            name: `Claim ${label} on mybday.lol`,
            description: "Bids are final. If someone outbids you, you stay on this day's birthday board.",
          },
        },
      },
    ],
    adaptive_pricing: { enabled: true },
    // The form email wins for claims; Stripe shows it prefilled (decided, 07 B8).
    customer_email: input.email,
    client_reference_id: input.metadata.paymentId,
    metadata: input.metadata,
    payment_intent_data: { metadata: input.metadata },
    expires_at: Math.floor(input.now.getTime() / 1000) + CHECKOUT_TTL_SECONDS,
    success_url: input.origin + routes.claimSuccessTemplate,
    cancel_url: input.origin + input.cancelPath,
    ...termsConsent(input.origin),
  };
}

type BoostCheckoutInput = {
  /** The person being boosted. */
  name: string;
  amountCents: number;
  metadata: CheckoutMetadata & { kind: "boost" };
  origin: string;
  /** The page the Boost box was opened on ("/" or "/october-7"); Stripe returns there. */
  returnPath: string;
  now: Date;
};

/**
 * A boost: one-time USD payment with Adaptive Pricing. No email is prefilled:
 * Stripe asks for it, and that email gets the receipt and, if ticked, the
 * outbid alerts (decided, 07 B8).
 */
export function boostCheckoutParams(input: BoostCheckoutInput): Stripe.Checkout.SessionCreateParams {
  const first = firstName(input.name);
  return {
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: input.amountCents,
          product_data: {
            name: `Boost ${input.name} on mybday.lol`,
            description: `Boosts are final and add to ${first}'s total. They're paid to mybday.lol, not to ${first}.`,
          },
        },
      },
    ],
    adaptive_pricing: { enabled: true },
    client_reference_id: input.metadata.paymentId,
    metadata: input.metadata,
    payment_intent_data: { metadata: input.metadata },
    expires_at: Math.floor(input.now.getTime() / 1000) + CHECKOUT_TTL_SECONDS,
    success_url: `${input.origin}${input.returnPath}?boosted={CHECKOUT_SESSION_ID}`,
    cancel_url: input.origin + input.returnPath,
    ...termsConsent(input.origin),
  };
}

/** Reads our metadata back off a Checkout Session. Null for sessions this app didn't create. */
export function readCheckoutMetadata(metadata: Record<string, string> | null | undefined): CheckoutMetadata | null {
  if (!metadata || (metadata.kind !== "claim" && metadata.kind !== "boost")) return null;
  const { paymentId, entryId, boardId } = metadata;
  if (!paymentId || !entryId || !boardId) return null;
  return { kind: metadata.kind, paymentId, entryId, boardId };
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

/** The browser sends a 512px JPEG (~50–150 KB); anything over this is not from our form. */
export const MAX_PHOTO_BYTES = 1_000_000;

/** Detects JPEG / PNG / WebP from the file's first bytes (never trust the declared type). */
export function sniffImage(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return "png";
  if (
    b.length >= 12 &&
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}
