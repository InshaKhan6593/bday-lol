import { db } from "@/db";
import { now } from "@/lib/clock";
import { handleStripeEvent } from "@/server/stripe-events";
import { verifyStripeEvent } from "@/server/stripe";

/**
 * Stripe webhook. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
 * A bad signature gets 400; a database error gets 500 so Stripe retries
 * (fulfilling is idempotent, so retries are safe).
 */
export async function POST(request: Request) {
  const body = await request.text();
  let event;
  try {
    event = verifyStripeEvent(body, request.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response("Invalid Stripe signature", { status: 400 });
  }
  const outcome = await handleStripeEvent(db, event, now());
  return Response.json({ received: true, ...outcome });
}
