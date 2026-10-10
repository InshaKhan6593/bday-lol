import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { alertSubscriptions, entries, leaderLog, outbidAlerts, payments } from "@/db/schema";
import { addBirthdayType, addPeople, inRollback, type Tx } from "@/test/db";
import { getBoostableEntry, getBoostOutcome } from "./boosts";
import { getRankedEntries } from "./leaderboard";
import { createPendingBoost, createPendingClaim, fulfillCheckout } from "./payments";

const oct7 = { month: 10, day: 7 };
const at = (hhmm: string) => new Date(`2026-10-07T${hhmm}:00-04:00`);

/** Today's board: Jess #1 at $240 (owner jess@), Tyler #2 at $225 (owner tyler@). */
async function board(tx: Tx) {
  const type = await addBirthdayType(tx);
  const b = await addPeople(tx, type, oct7, 2026, [
    { name: "Jess Moreno", usd: 240, reachedAt: "2026-10-07T09:00:00-04:00" },
    { name: "Tyler Brooks", usd: 225, reachedAt: "2026-10-07T08:00:00-04:00" },
  ]);
  const rows = await tx.select().from(entries);
  for (const r of rows) {
    await tx.update(entries).set({ ownerEmail: `${r.name.split(" ")[0]!.toLowerCase()}@example.com` }).where(eq(entries.id, r.id));
  }
  const id = (name: string) => rows.find((r) => r.name === name)!;
  // Jess has held #1 since 9:00.
  await tx.insert(leaderLog).values({ boardId: b.id, entryId: id("Jess Moreno").id, startedAt: at("09:00") });
  return { boardId: b.id, jess: id("Jess Moreno"), tyler: id("Tyler Brooks") };
}

async function boost(tx: Tx, entryId: string, usd: number, opts: { session: string; alert?: boolean }) {
  await createPendingBoost(tx, {
    paymentId: randomUUID(),
    entryId,
    sessionId: opts.session,
    amountCents: usd * 100,
    alertOptIn: opts.alert ?? false,
  });
}

const paid = (sessionId: string, email: string | null = null) => ({
  sessionId,
  presentment: null,
  paymentIntentId: null,
  customerEmail: email,
});

async function alertsFor(tx: Tx, entryId: string) {
  return (await tx.select().from(outbidAlerts).where(eq(outbidAlerts.entryId, entryId)))
    .map((a) => ({ email: a.email, dueAt: a.dueAt, sent: a.sentAt !== null }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

describe("boosts", () => {
  it("adds to the running total once paid, with the email Stripe collected", async () => {
    await inRollback(async (tx) => {
      const { jess } = await board(tx);
      await boost(tx, jess.id, 5, { session: "cs_test_b1", alert: true });

      // Nothing changes until the webhook.
      expect((await getRankedEntries(tx, jess.boardId))[0]?.totalCents).toBe(24_000);
      const result = await fulfillCheckout(tx, paid("cs_test_b1", "Fan@Example.com"), at("10:00"));
      expect(result).toMatchObject({ status: "fulfilled", kind: "boost", entryId: jess.id, alerted: [] });

      const [entry] = await tx.select().from(entries).where(eq(entries.id, jess.id));
      expect(entry).toMatchObject({ totalCents: 24_500, totalReachedAt: at("10:00") });
      const [payment] = await tx.select().from(payments).where(eq(payments.stripeSessionId, "cs_test_b1"));
      expect(payment).toMatchObject({ kind: "boost", status: "paid", amountCents: 500, email: "fan@example.com" });
      // "Email me if Jess gets passed" was ticked.
      expect(await tx.select({ email: alertSubscriptions.email }).from(alertSubscriptions)).toEqual([{ email: "fan@example.com" }]);
      // Repeated webhook: no double counting.
      expect(await fulfillCheckout(tx, paid("cs_test_b1", "fan@example.com"), at("10:01"))).toEqual({ status: "already" });
      expect((await getRankedEntries(tx, jess.boardId))[0]?.totalCents).toBe(24_500);
    });
  });

  it("doesn't subscribe the booster when the box was unticked", async () => {
    await inRollback(async (tx) => {
      const { jess } = await board(tx);
      await boost(tx, jess.id, 5, { session: "cs_test_b2", alert: false });
      await fulfillCheckout(tx, paid("cs_test_b2", "fan@example.com"), at("10:00"));
      expect(await tx.select().from(alertSubscriptions)).toEqual([]);
    });
  });

  it("taking #1 moves the log and alerts the passed owner plus their alert list, once each", async () => {
    await inRollback(async (tx) => {
      const { boardId, jess, tyler } = await board(tx);
      // Two fans asked to hear if Jess gets passed; one of them is Jess herself (different case).
      await boost(tx, jess.id, 2, { session: "cs_test_fan1", alert: true });
      await fulfillCheckout(tx, paid("cs_test_fan1", "fan@example.com"), at("09:30"));
      await boost(tx, jess.id, 2, { session: "cs_test_fan2", alert: true });
      await fulfillCheckout(tx, paid("cs_test_fan2", "JESS@example.com"), at("09:31"));

      // Tyler ($225) needs $20 to pass Jess ($244).
      await boost(tx, tyler.id, 20, { session: "cs_test_take" });
      const result = await fulfillCheckout(tx, paid("cs_test_take", "tylerfan@example.com"), at("14:40"));

      expect(result).toMatchObject({ previousTopEntryId: jess.id, topEntryId: tyler.id, boardClosed: false });
      expect(await alertsFor(tx, jess.id)).toEqual([
        { email: "fan@example.com", dueAt: at("14:40"), sent: false },
        { email: "jess@example.com", dueAt: at("14:40"), sent: false },
      ]);
      const log = await tx.select().from(leaderLog).where(eq(leaderLog.boardId, boardId));
      expect(log.map((r) => [r.entryId, r.endedAt])).toEqual(
        expect.arrayContaining([
          [jess.id, at("14:40")],
          [tyler.id, null],
        ]),
      );
    });
  });

  it("keeps at most one alert per 15 minutes per person, and one waiting alert per entry", async () => {
    await inRollback(async (tx) => {
      const { jess, tyler } = await board(tx);
      // jess@ got an alert at 14:35 (already sent).
      await tx.insert(outbidAlerts).values({ entryId: jess.id, email: "jess@example.com", dueAt: at("14:35"), sentAt: at("14:35") });

      await boost(tx, tyler.id, 20, { session: "cs_test_t1" });
      await fulfillCheckout(tx, paid("cs_test_t1"), at("14:40"));
      const waiting = (await alertsFor(tx, jess.id)).filter((a) => !a.sent);
      // Due 15 minutes after the last one, not right away.
      expect(waiting).toEqual([{ email: "jess@example.com", dueAt: at("14:50"), sent: false }]);

      // Jess takes #1 back, then loses it again before the alert went out: still one waiting alert.
      await boost(tx, jess.id, 10, { session: "cs_test_j1" });
      await fulfillCheckout(tx, paid("cs_test_j1"), at("14:42"));
      await boost(tx, tyler.id, 20, { session: "cs_test_t2" });
      await fulfillCheckout(tx, paid("cs_test_t2"), at("14:44"));
      expect((await alertsFor(tx, jess.id)).filter((a) => !a.sent)).toHaveLength(1);
    });
  });

  it("drops a waiting alert when the person takes #1 back", async () => {
    await inRollback(async (tx) => {
      const { jess, tyler } = await board(tx);
      await boost(tx, tyler.id, 20, { session: "cs_test_t1" });
      await fulfillCheckout(tx, paid("cs_test_t1"), at("14:40"));
      expect(await alertsFor(tx, jess.id)).toHaveLength(1);

      await boost(tx, jess.id, 20, { session: "cs_test_back" });
      const back = await fulfillCheckout(tx, paid("cs_test_back"), at("14:41"));
      expect(back).toMatchObject({ topEntryId: jess.id });
      expect(await alertsFor(tx, jess.id)).toEqual([]);
      // Tyler lost #1 in turn.
      expect((await alertsFor(tx, tyler.id)).map((a) => a.email)).toEqual(["tyler@example.com"]);
    });
  });

  it("sends no alerts for a boost on a lower rank, or once the day has ended (07 B5)", async () => {
    await inRollback(async (tx) => {
      const { jess, tyler } = await board(tx);
      await boost(tx, tyler.id, 5, { session: "cs_test_small" });
      expect(await fulfillCheckout(tx, paid("cs_test_small"), at("12:00"))).toMatchObject({ alerted: [] });

      await boost(tx, tyler.id, 100, { session: "cs_test_late" });
      const late = await fulfillCheckout(tx, paid("cs_test_late"), new Date("2026-10-08T00:01:00-04:00"));
      expect(late).toMatchObject({ boardClosed: true, topEntryId: tyler.id, alerted: [] });
      expect(await alertsFor(tx, jess.id)).toEqual([]);
    });
  });

  it("a claim that takes #1 alerts the passed owner too", async () => {
    await inRollback(async (tx) => {
      const { boardId, jess } = await board(tx);
      const ids = { entryId: randomUUID(), paymentId: randomUUID() };
      await createPendingClaim(tx, {
        ids,
        boardId,
        sessionId: "cs_test_claim",
        photoUrl: null,
        claim: { md: oct7, amountCents: 24_100, name: "Sam Rivera", bio: "", giftLinks: [], theme: "sky", email: "sam@example.com", isMinor: false },
      });
      const result = await fulfillCheckout(tx, paid("cs_test_claim"), at("15:00"));
      expect(result).toMatchObject({ kind: "claim", previousTopEntryId: jess.id, topEntryId: ids.entryId, alerted: ["jess@example.com"] });
    });
  });
});

describe("boost lookups", () => {
  it("only boosts live people on a board that's still open", async () => {
    await inRollback(async (tx) => {
      const { jess } = await board(tx);
      const ok = await getBoostableEntry(tx, jess.publicId, at("12:00"));
      expect(ok).toEqual({ ok: true, entry: { entryId: jess.id, boardId: jess.boardId, name: "Jess Moreno", md: oct7 } });
      expect(await getBoostableEntry(tx, jess.publicId, new Date("2026-10-08T00:00:00-04:00"))).toEqual({ ok: false, reason: "closed" });
      expect(await getBoostableEntry(tx, "nobody1234", at("12:00"))).toEqual({ ok: false, reason: "missing" });
      await tx.update(entries).set({ status: "removed" }).where(eq(entries.id, jess.id));
      expect(await getBoostableEntry(tx, jess.publicId, at("12:00"))).toEqual({ ok: false, reason: "missing" });
    });
  });

  it("reports what happened to a boost checkout", async () => {
    await inRollback(async (tx) => {
      const { tyler } = await board(tx);
      await boost(tx, tyler.id, 20, { session: "cs_test_look" });
      expect(await getBoostOutcome(tx, "cs_test_look")).toEqual({ status: "pending" });
      await fulfillCheckout(tx, paid("cs_test_look"), at("14:40"));
      expect(await getBoostOutcome(tx, "cs_test_look")).toEqual({
        status: "done",
        name: "Tyler Brooks",
        amountCents: 2_000,
        rank: 1,
        totalCents: 24_500,
      });
      expect(await getBoostOutcome(tx, "cs_test_nope")).toEqual({ status: "missing" });
    });
  });
});
