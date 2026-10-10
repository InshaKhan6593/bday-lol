import { eq } from "drizzle-orm";
import type { Executor } from "@/db";
import { payments } from "@/db/schema";
import { formatLong } from "@/lib/birthday";
import { takeTopBoost } from "@/lib/boost";
import { adminClaimEmail, boostReceiptEmail, claimConfirmationEmail, type Receipt } from "@/lib/email-templates";
import type { EventOutcome } from "../stripe-events";
import { loadEntryContext } from "./context";
import type { Mailer } from "./mailer";
import { sendDueOutbidAlerts } from "./scheduled";
import { emptyRun, sendCounted, type EmailRun } from "./send";

/**
 * The emails a paid checkout sends right away (spec §8):
 * claim → 1. confirmation to the claimer (doubles as the receipt) + 8. admin alert
 * boost → 2. receipt to the booster (Stripe's email)
 *
 * Called by the webhook after the payment is credited, and again on every Stripe
 * retry: dedupe keys per payment make that safe, and a failed send gets retried.
 */
export async function sendPaymentEmails(db: Executor, mailer: Mailer, sessionId: string, instant: Date): Promise<EmailRun> {
  const run = emptyRun();
  const [payment] = await db.select().from(payments).where(eq(payments.stripeSessionId, sessionId)).limit(1);
  if (!payment || payment.status !== "paid" || payment.kind === "comp") return run;

  const ctx = await loadEntryContext(db, payment.entryId, instant);
  // Taken down by the admin before the emails went out: nothing to confirm.
  if (!ctx?.mine) return run;
  const { entry, md, year, mine, ranked, settings } = ctx;
  const tz = settings.timezone;
  const day = formatLong(md);
  const receipt: Receipt = {
    amountCents: payment.amountCents,
    presentment:
      payment.presentmentCurrency && payment.presentmentAmount !== null
        ? { currency: payment.presentmentCurrency, amount: payment.presentmentAmount }
        : null,
    paidAt: payment.paidAt ?? instant,
    reference: payment.stripePaymentIntentId,
    item: payment.kind === "claim" ? `Claim ${day}, ${year} on mybday.lol` : `Boost ${entry.name} on mybday.lol`,
  };
  const person = { name: entry.name, bio: entry.bio, photoUrl: entry.photoUrl, theme: entry.theme };

  if (payment.kind === "claim") {
    if (payment.email) {
      const top = ranked[0]!;
      await sendCounted(
        db,
        mailer,
        {
          type: "claim_confirmation",
          to: payment.email,
          at: instant,
          dedupeKey: `claim:${payment.id}`,
          meta: { paymentId: payment.id, entryId: entry.id },
          content: claimConfirmationEmail({
            ...person,
            md,
            year,
            currentYear: ctx.today.year,
            rank: mine.rank,
            totalCents: mine.totalCents,
            toTopCents: mine.rank > 1 ? takeTopBoost(top.totalCents, mine.totalCents, settings.minBoostCents) : null,
            isToday: ctx.isToday,
            shareUrl: ctx.personUrl,
            receipt,
            timeZone: tz,
          }),
        },
        run,
      );
    }

    const admin = process.env.ADMIN_ALERT_EMAIL;
    if (admin) {
      await sendCounted(
        db,
        mailer,
        {
          type: "admin_claim",
          to: admin,
          at: instant,
          dedupeKey: `admin-claim:${payment.id}`,
          meta: { paymentId: payment.id, entryId: entry.id },
          content: adminClaimEmail({
            ...person,
            md,
            year,
            amountCents: payment.amountCents,
            rank: mine.rank,
            email: payment.email ?? entry.ownerEmail ?? "",
            giftLinks: entry.giftLinks,
            isMinor: entry.isMinor,
            dateUrl: ctx.dateUrl,
          }),
        },
        run,
      );
    }
    return run;
  }

  if (payment.email) {
    await sendCounted(
      db,
      mailer,
      {
        type: "boost_receipt",
        to: payment.email,
        at: instant,
        dedupeKey: `boost-receipt:${payment.id}`,
        meta: { paymentId: payment.id, entryId: entry.id },
        content: boostReceiptEmail({
          ...person,
          md,
          rank: mine.rank,
          totalCents: mine.totalCents,
          alertOptIn: payment.alertOptIn,
          dateUrl: ctx.personUrl,
          receipt,
          timeZone: tz,
        }),
      },
      run,
    );
  }
  return run;
}

/**
 * Everything the webhook sends after a Stripe event: the payment's own emails,
 * then any outbid alert that is due right now, so being passed is announced
 * within seconds instead of waiting for the next cron tick.
 */
export async function emailsAfterStripeEvent(
  db: Executor,
  mailer: Mailer,
  outcome: EventOutcome,
  instant: Date,
): Promise<{ payment: EmailRun; alerts: EmailRun } | null> {
  if (!outcome.handled || outcome.action !== "fulfilled" || outcome.result.status === "unknown") return null;
  const payment = await sendPaymentEmails(db, mailer, outcome.sessionId, instant);
  const alerts =
    outcome.result.status === "fulfilled" && outcome.result.alerted.length > 0
      ? await sendDueOutbidAlerts(db, mailer, instant)
      : emptyRun();
  return { payment, alerts };
}
