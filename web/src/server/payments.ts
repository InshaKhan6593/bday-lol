import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import type { Executor } from "@/db";
import { boards, entries, leaderLog, payments, reminders } from "@/db/schema";
import { parseKey } from "@/lib/birthday";
import type { ValidClaim } from "@/lib/claim";
import { publicId } from "@/lib/ids";
import { personSlug, uniqueSlug } from "@/lib/people";
import { cancelOutbidAlerts, queueOutbidAlerts, subscribeToAlerts } from "./outbid";

/**
 * The money path for claims and boosts:
 *   1. "Pay & claim" / "Boost $X" → a pending payment (plus a pending entry for claims), tied to the Stripe session.
 *   2. Stripe webhook "checkout.session.completed" → fulfillCheckout: payment paid, the entry's total
 *      updated, the #1 log moved and outbid alerts queued when someone loses #1.
 *   3. "checkout.session.expired" → expireCheckout: the payment is marked expired; nothing changes on the board.
 * Nothing becomes real before the webhook, and every step is safe to run twice.
 */

type PendingClaimInput = {
  ids: { entryId: string; paymentId: string };
  boardId: string;
  sessionId: string;
  claim: ValidClaim;
  photoUrl: string | null;
};

export async function createPendingClaim(db: Executor, input: PendingClaimInput): Promise<void> {
  const { ids, claim } = input;
  await db.transaction(async (tx) => {
    await tx.insert(entries).values({
      id: ids.entryId,
      publicId: publicId(),
      boardId: input.boardId,
      name: claim.name,
      bio: claim.bio,
      photoUrl: input.photoUrl,
      theme: claim.theme,
      giftLinks: claim.giftLinks,
      ownerEmail: claim.email,
      status: "pending",
    });
    await tx.insert(payments).values({
      id: ids.paymentId,
      entryId: ids.entryId,
      kind: "claim",
      status: "pending",
      amountCents: claim.amountCents,
      email: claim.email,
      stripeSessionId: input.sessionId,
    });
  });
}

type PendingBoostInput = {
  paymentId: string;
  entryId: string;
  sessionId: string;
  amountCents: number;
  /** "Email me if [name] gets passed" was ticked. The email itself comes from Stripe. */
  alertOptIn: boolean;
};

/** Every boost is its own payment row (spec §4), for receipts, refunds and outbid alerts. */
export async function createPendingBoost(db: Executor, input: PendingBoostInput): Promise<void> {
  await db.insert(payments).values({
    id: input.paymentId,
    entryId: input.entryId,
    kind: "boost",
    status: "pending",
    amountCents: input.amountCents,
    alertOptIn: input.alertOptIn,
    stripeSessionId: input.sessionId,
  });
}

/** What the webhook passes in from the Checkout Session. */
export type PaidSession = {
  sessionId: string;
  /** What the payer saw with Adaptive Pricing, e.g. GBP 400. Null when they paid in USD. */
  presentment: { currency: string; amount: number } | null;
  paymentIntentId: string | null;
  /** The email Stripe collected. Boosts use it for the receipt and alert list; claims keep the form email. */
  customerEmail: string | null;
};

export type FulfillResult =
  | { status: "unknown" }
  | { status: "already" }
  | {
      status: "fulfilled";
      kind: "claim" | "boost";
      boardId: string;
      entryId: string;
      /** #1 before and after this payment (equal when #1 didn't change; null when nobody is live). */
      previousTopEntryId: string | null;
      topEntryId: string | null;
      /** The board's day had already ended (paid 11:59 PM, landed after midnight): no outbid alerts (07 B5). */
      boardClosed: boolean;
      /** Emails queued for an outbid alert because someone lost #1. */
      alerted: string[];
    };

/**
 * Credits a paid claim or boost. Runs in one transaction that locks the board
 * row, so two payments landing at once can't mix up ranks, the #1 log or the
 * alerts (07 B6). The amount always counts, even if it no longer reaches the
 * rank it aimed for.
 */
export async function fulfillCheckout(db: Executor, paid: PaidSession, instant: Date): Promise<FulfillResult> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        paymentId: payments.id,
        kind: payments.kind,
        amountCents: payments.amountCents,
        alertOptIn: payments.alertOptIn,
        entryId: entries.id,
        boardId: entries.boardId,
        ownerEmail: entries.ownerEmail,
        name: entries.name,
      })
      .from(payments)
      .innerJoin(entries, eq(entries.id, payments.entryId))
      .where(eq(payments.stripeSessionId, paid.sessionId))
      .limit(1);
    if (!row || row.kind === "comp") return { status: "unknown" };
    const kind = row.kind;

    // Lock the board first, then re-read the payment under the lock (Stripe retries can arrive together).
    const [board] = await tx
      .select({ closesAt: boards.closesAt, key: boards.key })
      .from(boards)
      .where(eq(boards.id, row.boardId))
      .for("update");
    const [payment] = await tx
      .select({ status: payments.status })
      .from(payments)
      .where(eq(payments.id, row.paymentId))
      .for("update");
    if (payment?.status === "paid") return { status: "already" };

    const previousTopEntryId = await currentTopEntryId(tx, row.boardId);
    const boosterEmail = kind === "boost" ? (paid.customerEmail?.toLowerCase() ?? null) : null;

    await tx
      .update(payments)
      .set({
        status: "paid",
        paidAt: instant,
        stripePaymentIntentId: paid.paymentIntentId,
        presentmentCurrency: paid.presentment?.currency.toUpperCase() ?? null,
        presentmentAmount: paid.presentment?.amount ?? null,
        ...(kind === "boost" ? { email: boosterEmail } : {}),
      })
      .where(eq(payments.id, row.paymentId));

    if (kind === "claim") {
      // The personal link is picked under the board lock, so two Sam Riveras paying at once get -2 apart.
      const slug = await freeSlug(tx, row.boardId, row.name);
      await tx
        .update(entries)
        .set({ status: "live", slug, totalCents: row.amountCents, totalReachedAt: instant, liveAt: instant })
        .where(eq(entries.id, row.entryId));
      await addClaimReminder(tx, row.ownerEmail, board!.key);
    } else {
      // A boost adds to the running total; reaching the new total "now" decides ties (07 B2).
      await tx
        .update(entries)
        .set({ totalCents: sql`${entries.totalCents} + ${row.amountCents}`, totalReachedAt: instant })
        .where(eq(entries.id, row.entryId));
      if (row.alertOptIn && boosterEmail) await subscribeToAlerts(tx, row.entryId, boosterEmail);
    }

    const boardClosed = board!.closesAt.getTime() <= instant.getTime();
    // A boost on an entry the admin removed meanwhile still counts, but may leave nobody live: no #1 then.
    const topEntryId = await currentTopEntryId(tx, row.boardId);
    let alerted: string[] = [];
    if (topEntryId && topEntryId !== previousTopEntryId) {
      await moveLeader(tx, row.boardId, topEntryId, instant);
      await cancelOutbidAlerts(tx, topEntryId);
      // Only losing #1 sends an alert, and never for a day that has ended (07 B5).
      if (previousTopEntryId && !boardClosed) alerted = await queueOutbidAlerts(tx, previousTopEntryId, instant);
    }

    return {
      status: "fulfilled",
      kind,
      boardId: row.boardId,
      entryId: row.entryId,
      previousTopEntryId,
      topEntryId,
      boardClosed,
      alerted,
    };
  });
}

/** A personal link name not yet used on this board: "sam-rivera", then "sam-rivera-2"… */
export async function freeSlug(db: Executor, boardId: string, name: string): Promise<string> {
  const base = personSlug(name);
  const rows = await db
    .select({ slug: entries.slug })
    .from(entries)
    .where(and(eq(entries.boardId, boardId), sql`${entries.slug} LIKE ${`${base}%`}`));
  return uniqueSlug(base, rows.flatMap((r) => (r.slug ? [r.slug] : [])));
}

/**
 * Yearly re-claim (spec §8, email 7): claimers are added to the birthday
 * reminder for their date. Someone who already has a reminder for it, or
 * unsubscribed from it, is left as they are.
 */
async function addClaimReminder(db: Executor, email: string | null, key: string): Promise<void> {
  const md = parseKey(key);
  if (!email || !md) return;
  await db
    .insert(reminders)
    .values({ email: email.toLowerCase(), month: md.month, day: md.day, source: "claim" })
    .onConflictDoNothing({ target: [reminders.email, reminders.month, reminders.day] });
}

/** Checkout timed out or failed: the payment is expired and nothing changes on the board. */
export async function expireCheckout(db: Executor, sessionId: string): Promise<boolean> {
  const updated = await db
    .update(payments)
    .set({ status: "expired" })
    .where(and(eq(payments.stripeSessionId, sessionId), eq(payments.status, "pending")))
    .returning({ id: payments.id });
  return updated.length > 0;
}

/** The live #1 on a board: highest total, ties to whoever got there first. */
async function currentTopEntryId(db: Executor, boardId: string): Promise<string | null> {
  const [top] = await db
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.boardId, boardId), eq(entries.status, "live")))
    .orderBy(desc(entries.totalCents), asc(entries.totalReachedAt))
    .limit(1);
  return top?.id ?? null;
}

/** Closes the current #1 stint and opens a new one (powers the "held the homepage" lines). */
async function moveLeader(db: Executor, boardId: string, entryId: string, at: Date): Promise<void> {
  await db
    .update(leaderLog)
    .set({ endedAt: at })
    .where(and(eq(leaderLog.boardId, boardId), isNull(leaderLog.endedAt)));
  await db.insert(leaderLog).values({ boardId, entryId, startedAt: at });
}
