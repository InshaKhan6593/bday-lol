import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { entries, payments } from "@/db/schema";
import { addBirthdayType, addPeople, inRollback, type Tx } from "@/test/db";
import { getClaimOutcome } from "./claim-result";

// Noon ET on October 7, 2026.
const NOON_OCT_7 = new Date("2026-10-07T12:00:00-04:00");
const oct7 = { month: 10, day: 7 };
const oct12 = { month: 10, day: 12 };
const oct1 = { month: 10, day: 1 };

async function entryId(tx: Tx, name: string): Promise<string> {
  const [row] = await tx.select({ id: entries.id }).from(entries).where(eq(entries.name, name));
  return row!.id;
}

async function pay(tx: Tx, name: string, sessionId: string, status: "pending" | "paid" | "expired" = "paid", usd = 5) {
  await tx.insert(payments).values({
    entryId: await entryId(tx, name),
    kind: "claim",
    status,
    amountCents: usd * 100,
    email: "sam@example.com",
    stripeSessionId: sessionId,
    paidAt: status === "paid" ? NOON_OCT_7 : null,
  });
}

const today = [
  { name: "Sam Rivera", usd: 241, reachedAt: "2026-10-07T11:00:00-04:00", theme: "sky" as const },
  { name: "Jess Moreno", usd: 240, reachedAt: "2026-10-07T09:00:00-04:00", theme: "lime" as const },
];

describe("claim outcome (Success page)", () => {
  it("is today's #1: owns the homepage", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      await addPeople(tx, type, oct7, 2026, today);
      await pay(tx, "Sam Rivera", "cs_test_today1", "paid", 241);

      const out = await getClaimOutcome(tx, "cs_test_today1", NOON_OCT_7);
      expect(out).toEqual({
        status: "done",
        placement: { md: oct7, year: 2026, rank: 1, when: "today", currentYear: 2026, toTopCents: null },
        you: { name: "Sam Rivera", photoUrl: null, theme: "sky", slug: "sam-rivera" },
        top: { name: "Sam Rivera", photoUrl: null, theme: "sky", slug: "sam-rivera" },
      });
    });
  });

  it("shows the real rank when someone passed the bid while paying (07 B6)", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      await addPeople(tx, type, oct7, 2026, today);
      await pay(tx, "Jess Moreno", "cs_test_passed", "paid", 240);

      const out = await getClaimOutcome(tx, "cs_test_passed", NOON_OCT_7);
      if (out.status !== "done") throw new Error(out.status);
      expect(out.placement.rank).toBe(2);
      // $241 - $240 + $1 = $2, the minimum boost.
      expect(out.placement.toTopCents).toBe(200);
      expect(out.you.name).toBe("Jess Moreno");
      expect(out.top.name).toBe("Sam Rivera");
    });
  });

  it("is upcoming for a later date, and next year's board for a passed one", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      await addPeople(tx, type, oct12, 2026, [{ name: "Ana Reyes", usd: 5, reachedAt: "2026-10-07T10:00:00-04:00" }]);
      await addPeople(tx, type, oct1, 2027, [{ name: "Early Bird", usd: 20, reachedAt: "2026-10-07T10:00:00-04:00" }]);
      await pay(tx, "Ana Reyes", "cs_test_future");
      await pay(tx, "Early Bird", "cs_test_nextyear", "paid", 20);

      const soon = await getClaimOutcome(tx, "cs_test_future", NOON_OCT_7);
      expect(soon.status === "done" && soon.placement).toMatchObject({ md: oct12, year: 2026, when: "upcoming" });
      const later = await getClaimOutcome(tx, "cs_test_nextyear", NOON_OCT_7);
      expect(later.status === "done" && later.placement).toMatchObject({ md: oct1, year: 2027, when: "upcoming" });
    });
  });

  it("is closed when the day ended before the visit (paid 11:59 PM, opened after midnight)", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      await addPeople(tx, type, oct7, 2026, today);
      await pay(tx, "Sam Rivera", "cs_test_late", "paid", 241);
      const out = await getClaimOutcome(tx, "cs_test_late", new Date("2026-10-08T00:01:00-04:00"));
      expect(out.status === "done" && out.placement.when).toBe("closed");
    });
  });

  it("waits while the webhook is on its way, and reports expired, removed and unknown sessions", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      await addPeople(tx, type, oct7, 2026, [
        { name: "Waiting Person", usd: 5, reachedAt: "2026-10-07T10:00:00-04:00", status: "pending" },
        { name: "Gave Up", usd: 5, reachedAt: "2026-10-07T10:00:00-04:00", status: "pending" },
        { name: "Removed Person", usd: 5, reachedAt: "2026-10-07T10:00:00-04:00", status: "removed" },
      ]);
      await pay(tx, "Waiting Person", "cs_test_waiting", "pending");
      await pay(tx, "Gave Up", "cs_test_expired", "expired");
      await pay(tx, "Removed Person", "cs_test_removed");

      expect(await getClaimOutcome(tx, "cs_test_waiting", NOON_OCT_7)).toEqual({ status: "pending" });
      expect(await getClaimOutcome(tx, "cs_test_expired", NOON_OCT_7)).toEqual({ status: "expired" });
      expect(await getClaimOutcome(tx, "cs_test_removed", NOON_OCT_7)).toEqual({ status: "missing" });
      expect(await getClaimOutcome(tx, "cs_test_nope", NOON_OCT_7)).toEqual({ status: "missing" });
    });
  });

  it("ignores boost payments", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      await addPeople(tx, type, oct7, 2026, today);
      await tx.insert(payments).values({
        entryId: await entryId(tx, "Sam Rivera"),
        kind: "boost",
        status: "paid",
        amountCents: 500,
        stripeSessionId: "cs_test_boost",
      });
      expect(await getClaimOutcome(tx, "cs_test_boost", NOON_OCT_7)).toEqual({ status: "missing" });
    });
  });
});
