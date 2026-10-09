import Stripe from "stripe";

let client: Stripe | null = null;

/** The server's Stripe client (test keys locally). Created on first use so pages that never pay don't need a key. */
export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set. Add your Stripe test key to .env.local.");
  client = new Stripe(key);
  return client;
}

/** Checks the Stripe-Signature header against the raw body. Throws if it wasn't signed with our webhook secret. */
export function verifyStripeEvent(rawBody: string, signature: string | null, secret: string | undefined): Stripe.Event {
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  if (!signature) throw new Error("Missing Stripe-Signature header.");
  // Signature checks are local (no API call), so any client instance works.
  return Stripe.webhooks.constructEvent(rawBody, signature, secret);
}
