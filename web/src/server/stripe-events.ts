import type Stripe from "stripe";
import type { Executor } from "@/db";
import { readCheckoutMetadata } from "@/lib/checkout";
import { paymentMethodLabel } from "@/lib/payment-method";
import { expireCheckout, fulfillCheckout, type FulfillResult } from "./payments";
import { getStripe } from "./stripe";

/** Finds how a payment was made ("Visa •••• 4242") from its PaymentIntent id. */
export type PaymentMethodLookup = (paymentIntentId: string) => Promise<string | null>;

/**
 * Asks Stripe for the card behind a payment (the Checkout Session in the event
 * doesn't say). Only for the receipt: if Stripe can't be reached, the payment
 * still goes through and the receipt leaves the card out.
 */
export const stripePaymentMethod: PaymentMethodLookup = async (paymentIntentId) => {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  try {
    const intent = await getStripe().paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
    const charge = intent.latest_charge;
    return typeof charge === "object" && charge ? paymentMethodLabel(charge.payment_method_details) : null;
  } catch (error) {
    console.warn("[stripe] couldn't read the payment method for the receipt", error);
    return null;
  }
};

export type EventOutcome =
  | { handled: false; reason: string }
  | { handled: true; action: "fulfilled"; sessionId: string; result: FulfillResult }
  | { handled: true; action: "expired"; changed: boolean }
  | { handled: true; action: "waiting" };

/** Applies one verified Stripe event to the database. Only Checkout Sessions this app created are touched. */
export async function handleStripeEvent(
  db: Executor,
  event: Stripe.Event,
  instant: Date,
  lookupMethod: PaymentMethodLookup = stripePaymentMethod,
): Promise<EventOutcome> {
  if (!event.type.startsWith("checkout.session.")) return { handled: false, reason: `ignored ${event.type}` };
  const session = event.data.object as Stripe.Checkout.Session;
  if (!readCheckoutMetadata(session.metadata)) return { handled: false, reason: "not our session" };

  switch (event.type) {
    case "checkout.session.completed":
      // Card payments are "paid" here; delayed methods finish in async_payment_succeeded.
      if (session.payment_status !== "paid") return { handled: true, action: "waiting" };
      return fulfilled(db, session, instant, lookupMethod);
    case "checkout.session.async_payment_succeeded":
      return fulfilled(db, session, instant, lookupMethod);
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      return { handled: true, action: "expired", changed: await expireCheckout(db, session.id) };
    default:
      return { handled: false, reason: `ignored ${event.type}` };
  }
}

async function fulfilled(
  db: Executor,
  session: Stripe.Checkout.Session,
  instant: Date,
  lookupMethod: PaymentMethodLookup,
): Promise<EventOutcome> {
  const result = await fulfillCheckout(db, await paidSession(session, lookupMethod), instant);
  return { handled: true, action: "fulfilled", sessionId: session.id, result };
}

async function paidSession(session: Stripe.Checkout.Session, lookupMethod: PaymentMethodLookup) {
  const p = session.presentment_details;
  const intent = session.payment_intent;
  const paymentIntentId = typeof intent === "string" ? intent : (intent?.id ?? null);
  return {
    sessionId: session.id,
    presentment: p && p.presentment_currency.toLowerCase() !== "usd" ? { currency: p.presentment_currency, amount: p.presentment_amount } : null,
    paymentIntentId,
    paymentMethod: paymentIntentId ? await lookupMethod(paymentIntentId) : null,
    customerEmail: session.customer_details?.email ?? null,
  };
}
