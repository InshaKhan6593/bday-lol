import type Stripe from "stripe";
import type { Executor } from "@/db";
import { readCheckoutMetadata } from "@/lib/checkout";
import { expireCheckout, fulfillCheckout, type FulfillResult } from "./payments";

export type EventOutcome =
  | { handled: false; reason: string }
  | { handled: true; action: "fulfilled"; result: FulfillResult }
  | { handled: true; action: "expired"; changed: boolean }
  | { handled: true; action: "waiting" };

/** Applies one verified Stripe event to the database. Only Checkout Sessions this app created are touched. */
export async function handleStripeEvent(db: Executor, event: Stripe.Event, instant: Date): Promise<EventOutcome> {
  if (!event.type.startsWith("checkout.session.")) return { handled: false, reason: `ignored ${event.type}` };
  const session = event.data.object as Stripe.Checkout.Session;
  if (!readCheckoutMetadata(session.metadata)) return { handled: false, reason: "not our session" };

  switch (event.type) {
    case "checkout.session.completed":
      // Card payments are "paid" here; delayed methods finish in async_payment_succeeded.
      if (session.payment_status !== "paid") return { handled: true, action: "waiting" };
      return { handled: true, action: "fulfilled", result: await fulfillCheckout(db, paidSession(session), instant) };
    case "checkout.session.async_payment_succeeded":
      return { handled: true, action: "fulfilled", result: await fulfillCheckout(db, paidSession(session), instant) };
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      return { handled: true, action: "expired", changed: await expireCheckout(db, session.id) };
    default:
      return { handled: false, reason: `ignored ${event.type}` };
  }
}

function paidSession(session: Stripe.Checkout.Session) {
  const p = session.presentment_details;
  const intent = session.payment_intent;
  return {
    sessionId: session.id,
    presentment: p && p.presentment_currency.toLowerCase() !== "usd" ? { currency: p.presentment_currency, amount: p.presentment_amount } : null,
    paymentIntentId: typeof intent === "string" ? intent : (intent?.id ?? null),
    customerEmail: session.customer_details?.email ?? null,
  };
}
