import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { entries, leaderLog, payments } from "@/db/schema";
import type { ValidClaim } from "@/lib/claim";
import { addBirthdayType, addPeople, inRollback, type Tx } from "@/test/db";
import { ensureBoard } from "./boards";
import { createPendingClaim, expireCheckout, fulfillCheckout } from "./claims";
import { getRankedEntries } from "./leaderboard";

const oct7 = { month: 10, day: 7 };
const NOON = new Date("2026-10-07T12:00:00-04:00");
const at = (hhmm: string) => new Date(`2026-10-07T${hhmm}:00-04:00`);

function claim(name: string, usd: number): ValidClaim {
  return {
    md: oct7,
    amountCents: usd * 100,
    name,
    bio: "",
    giftLinks: [{ service: "venmo", url: "https://venmo.com/u/sam" }],
    theme: "sky",
    email: `${name.split(" ")[0]!.toLowerCase()}@example.com`,
  };
}

async function pending(tx: Tx, boardId: string, sessionId: string, c: ValidClaim) {
  const ids = { entryId: randomUUID(), paymentId: randomUUID() };
  await createPendingClaim(tx, { ids, boardId, sessionId, claim: c, photoUrl: null });
  return ids;
}

const paid = (sessionId: string) => ({ sessionId, presentment: null, paymentIntentId: "pi_123" });

async function openLog(tx: Tx, boardId: string) {
  return (await tx.select().from(leaderLog).where(eq(leaderLog.boardId, boardId))).filter((r) => r.endedAt === null);
}

describe("claim money path", () => {
  it("creates a hidden pending entry until Stripe confirms the payment", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await ensureBoard(tx, type, oct7, 2026);
      const ids = await pending(tx, board.id, "cs_test_a", claim("Sam Rivera", 241));

      const [entry] = await tx.select().from(entries).where(eq(entries.id, ids.entryId));
      expect(entry).toMatchObject({ status: "pending", totalCents: 0, ownerEmail: "sam@example.com", theme: "sky" });
      const [payment] = await tx.select().from(payments).where(eq(payments.id, ids.paymentId));
      expect(payment).toMatchObject({ status: "pending", kind: "claim", amountCents: 24_100, stripeSessionId: "cs_test_a" });
      expect(await getRankedEntries(tx, board.id)).toEqual([]);
    });
  });

  it("puts the entry live, records the payment and opens the #1 log", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await ensureBoard(tx, type, oct7, 2026);
      const ids = await pending(tx, board.id, "cs_test_a", claim("Sam Rivera", 241));

      const result = await fulfillCheckout(
        tx,
        { sessionId: "cs_test_a", presentment: { currency: "gbp", amount: 19_000 }, paymentIntentId: "pi_1" },
        NOON,
      );
      expect(result).toEqual({
        status: "fulfilled",
        boardId: board.id,
        entryId: ids.entryId,
        previousTopEntryId: null,
        topEntryId: ids.entryId,
        boardClosed: false,
      });
      const [entry] = await tx.select().from(entries).where(eq(entries.id, ids.entryId));
      expect(entry).toMatchObject({ status: "live", totalCents: 24_100, totalReachedAt: NOON, liveAt: NOON });
      const [payment] = await tx.select().from(payments).where(eq(payments.id, ids.paymentId));
      expect(payment).toMatchObject({
        status: "paid",
        paidAt: NOON,
        stripePaymentIntentId: "pi_1",
        presentmentCurrency: "GBP",
        presentmentAmount: 19_000,
      });
      expect(await openLog(tx, board.id)).toMatchObject([{ entryId: ids.entryId, startedAt: NOON }]);
    });
  });

  it("is idempotent: a repeated webhook changes nothing", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await ensureBoard(tx, type, oct7, 2026);
      await pending(tx, board.id, "cs_test_a", claim("Sam Rivera", 241));
      await fulfillCheckout(tx, paid("cs_test_a"), NOON);

      expect(await fulfillCheckout(tx, paid("cs_test_a"), at("12:05"))).toEqual({ status: "already" });
      const ranked = await getRankedEntries(tx, board.id);
      expect(ranked.map((e) => e.totalCents)).toEqual([24_100]);
      expect(await tx.select().from(leaderLog)).toHaveLength(1);
    });
  });

  it("hands #1 over in the log when a bigger claim lands, and leaves it when a smaller one does", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await ensureBoard(tx, type, oct7, 2026);
      const jess = await pending(tx, board.id, "cs_test_jess", claim("Jess Moreno", 240));
      await fulfillCheckout(tx, paid("cs_test_jess"), at("09:00"));

      const sam = await pending(tx, board.id, "cs_test_sam", claim("Sam Rivera", 241));
      const takeover = await fulfillCheckout(tx, paid("cs_test_sam"), at("14:40"));
      expect(takeover).toMatchObject({ previousTopEntryId: jess.entryId, topEntryId: sam.entryId });

      await pending(tx, board.id, "cs_test_ana", claim("Ana Reyes", 150));
      const lower = await fulfillCheckout(tx, paid("cs_test_ana"), at("15:00"));
      expect(lower).toMatchObject({ previousTopEntryId: sam.entryId, topEntryId: sam.entryId });

      const log = await tx.select().from(leaderLog).where(eq(leaderLog.boardId, board.id));
      expect(log.map((r) => [r.entryId, r.startedAt, r.endedAt])).toEqual(
        expect.arrayContaining([
          [jess.entryId, at("09:00"), at("14:40")],
          [sam.entryId, at("14:40"), null],
        ]),
      );
      expect(log).toHaveLength(2);
    });
  });

  it("credits a bid that got passed while paying, at its real rank (07 B6)", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await ensureBoard(tx, type, oct7, 2026);
      // Both people saw Jess at $240 and bid $241; Ana's payment lands first.
      await addPeople(tx, type, oct7, 2026, [{ name: "Jess Moreno", usd: 240, reachedAt: "2026-10-07T09:00:00-04:00" }]);
      await pending(tx, board.id, "cs_test_ana", claim("Ana Reyes", 241));
      await pending(tx, board.id, "cs_test_sam", claim("Sam Rivera", 241));
      await fulfillCheckout(tx, paid("cs_test_ana"), at("10:00"));
      const late = await fulfillCheckout(tx, paid("cs_test_sam"), at("10:01"));

      expect(late.status).toBe("fulfilled");
      // A tie never passes: whoever reached $241 first stays ahead.
      expect((await getRankedEntries(tx, board.id)).map((e) => [e.rank, e.name])).toEqual([
        [1, "Ana Reyes"],
        [2, "Sam Rivera"],
        [3, "Jess Moreno"],
      ]);
    });
  });

  it("flags a payment that lands after the board's day ended (07 B5)", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await ensureBoard(tx, type, oct7, 2026);
      await pending(tx, board.id, "cs_test_late", claim("Sam Rivera", 5));
      const result = await fulfillCheckout(tx, paid("cs_test_late"), new Date("2026-10-08T00:01:00-04:00"));
      expect(result).toMatchObject({ status: "fulfilled", boardClosed: true });
    });
  });

  it("expires an abandoned checkout once, and never one that was paid", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await ensureBoard(tx, type, oct7, 2026);
      const gone = await pending(tx, board.id, "cs_test_gone", claim("Gave Up", 5));
      await pending(tx, board.id, "cs_test_paid", claim("Sam Rivera", 5));
      await fulfillCheckout(tx, paid("cs_test_paid"), NOON);

      expect(await expireCheckout(tx, "cs_test_gone")).toBe(true);
      expect(await expireCheckout(tx, "cs_test_gone")).toBe(false);
      expect(await expireCheckout(tx, "cs_test_paid")).toBe(false);
      const [entry] = await tx.select().from(entries).where(eq(entries.id, gone.entryId));
      expect(entry?.status).toBe("pending");
      const [payment] = await tx.select().from(payments).where(eq(payments.stripeSessionId, "cs_test_paid"));
      expect(payment?.status).toBe("paid");
    });
  });

  it("ignores sessions it doesn't know", async () => {
    await inRollback(async (tx) => {
      await addBirthdayType(tx);
      expect(await fulfillCheckout(tx, paid("cs_test_nope"), NOON)).toEqual({ status: "unknown" });
    });
  });
});
