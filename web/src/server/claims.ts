import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { Executor } from "@/db";
import { boards, entries, leaderLog, payments } from "@/db/schema";
import type { ValidClaim } from "@/lib/claim";
import { publicId } from "@/lib/ids";

/**
 * The claim money path (step 6):
 *   1. "Pay & claim" → createPendingClaim: a pending entry + a pending payment, tied to the Stripe session.
 *   2. Stripe webhook "checkout.session.completed" → fulfillCheckout: payment paid, entry live, #1 log updated.
 *   3. "checkout.session.expired" → expireCheckout: the payment is marked expired; the entry never goes live.
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

/** What the webhook passes in from the Checkout Session. */
export type PaidSession = {
  sessionId: string;
  /** What the payer saw with Adaptive Pricing, e.g. GBP 400. Null when they paid in USD. */
  presentment: { currency: string; amount: number } | null;
  paymentIntentId: string | null;
};

export type FulfillResult =
  | { status: "unknown" }
  | { status: "already" }
  | {
      status: "fulfilled";
      boardId: string;
      entryId: string;
      /** #1 before and after this payment (equal when #1 didn't change). Outbid alerts (step 7) start here. */
      previousTopEntryId: string | null;
      topEntryId: string;
      /** The board's day had already ended (paid 11:59 PM, landed after midnight): no outbid alerts (07 B5). */
      boardClosed: boolean;
    };

/**
 * Credits a paid claim. Runs in one transaction that locks the board row, so
 * two payments landing at once can't mix up ranks or the #1 log (07 B6). The
 * amount always counts, even if it no longer passes the rank it aimed for.
 */
export async function fulfillCheckout(db: Executor, paid: PaidSession, instant: Date): Promise<FulfillResult> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        paymentId: payments.id,
        paymentStatus: payments.status,
        amountCents: payments.amountCents,
        entryId: entries.id,
        boardId: entries.boardId,
      })
      .from(payments)
      .innerJoin(entries, eq(entries.id, payments.entryId))
      .where(and(eq(payments.stripeSessionId, paid.sessionId), eq(payments.kind, "claim")))
      .limit(1);
    if (!row) return { status: "unknown" };

    // Lock the board first, then re-read the payment under the lock (Stripe retries can arrive together).
    const [board] = await tx
      .select({ closesAt: boards.closesAt })
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

    await tx
      .update(payments)
      .set({
        status: "paid",
        paidAt: instant,
        stripePaymentIntentId: paid.paymentIntentId,
        presentmentCurrency: paid.presentment?.currency.toUpperCase() ?? null,
        presentmentAmount: paid.presentment?.amount ?? null,
      })
      .where(eq(payments.id, row.paymentId));
    await tx
      .update(entries)
      .set({ status: "live", totalCents: row.amountCents, totalReachedAt: instant, liveAt: instant })
      .where(eq(entries.id, row.entryId));

    const topEntryId = (await currentTopEntryId(tx, row.boardId))!;
    if (topEntryId !== previousTopEntryId) await moveLeader(tx, row.boardId, topEntryId, instant);

    return {
      status: "fulfilled",
      boardId: row.boardId,
      entryId: row.entryId,
      previousTopEntryId,
      topEntryId,
      boardClosed: board!.closesAt.getTime() <= instant.getTime(),
    };
  });
}

/** Checkout timed out or failed: the payment is expired and the entry stays pending (never shown). */
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
