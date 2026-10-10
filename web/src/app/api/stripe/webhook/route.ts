import { db } from "@/db";
import { now } from "@/lib/clock";
import { getMailer } from "@/server/email/mailer";
import { emailsAfterStripeEvent } from "@/server/email/payment-emails";
import { handleStripeEvent } from "@/server/stripe-events";
import { verifyStripeEvent } from "@/server/stripe";

/**
 * Stripe webhook. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
 * A bad signature gets 400; a database error gets 500 so Stripe retries
 * (fulfilling is idempotent, so retries are safe). A receipt that fails to send
 * also gets 500: the retry finds the payment already credited and only re-sends
 * what didn't go out.
 */
export async function POST(request: Request) {
  const body = await request.text();
  let event;
  try {
    event = verifyStripeEvent(body, request.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response("Invalid Stripe signature", { status: 400 });
  }
  const instant = now();
  const outcome = await handleStripeEvent(db, event, instant);
  const emails = await emailsAfterStripeEvent(db, getMailer(), outcome, instant);
  if (emails?.alerts.failed) console.error("Outbid alerts failed (the cron retries them):", emails.alerts.errors);
  if (emails?.payment.failed) {
    console.error("Payment emails failed:", emails.payment.errors);
    return Response.json({ received: true, ...outcome, emails: "failed" }, { status: 500 });
  }
  return Response.json({ received: true, ...outcome });
}
