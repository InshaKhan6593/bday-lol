import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/db";
import { entries } from "@/db/schema";
import { now } from "@/lib/clock";
import { pagesAfterBoardChange } from "@/lib/warm";
import { CACHE_TAGS, SAVED_PAGE_ROUTES } from "@/server/cached";
import { getMailer } from "@/server/email/mailer";
import { emailsAfterStripeEvent } from "@/server/email/payment-emails";
import { announceBoardChange } from "@/server/live";
import { handleStripeEvent } from "@/server/stripe-events";
import { verifyStripeEvent } from "@/server/stripe";
import { warmAfterChange } from "@/server/warm";

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
  // A payment changes a board's top bid: rebuild the cached month pages now, not at their next minute.
  // The date picker's top bids are cached too (server/cached.ts): drop them at once, not stale-while-revalidate.
  if (outcome.handled && outcome.action === "fulfilled") {
    revalidatePath("/months/[month]", "page");
    // The saved homepage and date pages too (lib/day-cache.ts): every date page shows the date picker's top bids.
    for (const route of SAVED_PAGE_ROUTES) revalidatePath(route, "page");
    revalidateTag(CACHE_TAGS.boards, { expire: 0 });
    // Pages that are open on this board re-read it now (lib/live.ts). After the caches are dropped, so they
    // read the new board; before the emails, which can take seconds.
    if (outcome.result.status === "fulfilled") {
      await announceBoardChange(outcome.result.boardKey);
      // The pages this payment shows on are built again once this answer has gone out, so the payer
      // and the next visitor find them ready (lib/warm.ts): the homepage, the date, its month and
      // the payer's own link.
      const [paidFor] = await db.select({ slug: entries.slug }).from(entries).where(eq(entries.id, outcome.result.entryId)).limit(1);
      warmAfterChange(pagesAfterBoardChange(outcome.result.boardKey, [paidFor?.slug ?? null]));
    }
  }
  const emails = await emailsAfterStripeEvent(db, getMailer(), outcome, instant);
  if (emails?.alerts.failed) console.error("Outbid alerts failed (the cron retries them):", emails.alerts.errors);
  if (emails?.payment.failed) {
    console.error("Payment emails failed:", emails.payment.errors);
    return Response.json({ received: true, ...outcome, emails: "failed" }, { status: 500 });
  }
  return Response.json({ received: true, ...outcome });
}
