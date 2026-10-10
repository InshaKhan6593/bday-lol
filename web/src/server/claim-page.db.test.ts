import { describe, expect, it } from "vitest";
import { addBirthdayType, addPeople, inRollback } from "@/test/db";
import { getClaimPageData } from "./claim-page";

// Noon ET on October 7, 2026.
const NOON_OCT_7 = new Date("2026-10-07T12:00:00-04:00");
const oct7 = { month: 10, day: 7 };
const oct1 = { month: 10, day: 1 };

const board = [
  { name: "Jess Moreno", usd: 240, reachedAt: "2026-10-07T14:40:00-04:00" },
  { name: "Tyler Brooks", usd: 225, reachedAt: "2026-10-07T09:12:00-04:00" },
  { name: "Ana Reyes", usd: 150, reachedAt: "2026-10-07T08:00:00-04:00" },
  { name: "Removed Person", usd: 999, reachedAt: "2026-10-07T07:00:00-04:00", status: "removed" as const },
];

describe("claim page data", () => {
  it("starts blank when no date is given (handoff v2)", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      await addPeople(tx, type, oct7, 2026, board);
      const page = await getClaimPageData(tx, null, 1, NOON_OCT_7);
      expect(page.md).toBeNull();
      expect(page.year).toBeNull();
      expect(page.target).toEqual({ rank: 1, name: null, totalCents: null });
      expect(page.minCents).toBe(500);
      // For the "Today ends in 12 min" warning: today ends at midnight ET.
      expect(page.today).toEqual(oct7);
      expect(page.dayEndsAt).toBe(new Date("2026-10-08T00:00:00-04:00").toISOString());
      expect(page.serverNow).toBe(NOON_OCT_7.toISOString());
    });
  });

  it("targets the rank picked with Claim this rank, skipping removed people", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      await addPeople(tx, type, oct7, 2026, board);
      const page = await getClaimPageData(tx, oct7, 2, NOON_OCT_7);
      expect(page.target).toEqual({ rank: 2, name: "Tyler Brooks", totalCents: 22_500 });
      expect(page.minCents).toBe(22_600);
    });
  });

  it("falls back to the #1 when the rank no longer exists", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      await addPeople(tx, type, oct7, 2026, board);
      const page = await getClaimPageData(tx, oct7, 9, NOON_OCT_7);
      expect(page.target.rank).toBe(1);
      expect(page.target.name).toBe("Jess Moreno");
    });
  });

  it("opens an empty date at $5 and uses next year's board for a passed date", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      // Last year's winner on the closed 2026 board must not count.
      await addPeople(tx, type, oct1, 2026, [{ name: "Old Winner", usd: 500, reachedAt: "2026-09-01T09:00:00-04:00" }]);
      const page = await getClaimPageData(tx, oct1, 1, NOON_OCT_7);
      expect(page.year).toBe(2027);
      expect(page.target).toEqual({ rank: 1, name: null, totalCents: null });
      expect(page.minCents).toBe(500);
    });
  });
});
