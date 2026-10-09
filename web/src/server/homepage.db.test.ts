import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { reminders } from "@/db/schema";
import { addBirthdayType, addPeople, inRollback } from "@/test/db";
import { getHomepageData } from "./homepage";
import { getBirthdaySettings, getCurrentBoard } from "./leaderboard";
import { saveReminder } from "./reminders";

// Noon ET on October 7, 2026.
const NOON_OCT_7 = new Date("2026-10-07T12:00:00-04:00");
const oct7 = { month: 10, day: 7 };

describe("homepage data", () => {
  it("puts today's highest total on the homepage and ranks everyone else", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      await addPeople(tx, type, oct7, 2026, [
        { name: "Tyler Brooks", usd: 225, reachedAt: "2026-10-07T09:00:00-04:00" },
        { name: "Jess Moreno", usd: 240, reachedAt: "2026-10-07T11:00:00-04:00", theme: "lime" },
        // Tie at $150: Ana got there first, so she stays ahead of Sam.
        { name: "Sam Ortiz", usd: 150, reachedAt: "2026-10-07T10:30:00-04:00" },
        { name: "Ana Reyes", usd: 150, reachedAt: "2026-10-07T08:00:00-04:00" },
        // Not shown: taken down by admin, or not paid yet.
        { name: "Removed Person", usd: 999, reachedAt: "2026-10-07T07:00:00-04:00", status: "removed" },
        { name: "Pending Person", usd: 500, reachedAt: "2026-10-07T07:00:00-04:00", status: "pending" },
      ]);
      // Last year's board for the same date must not count.
      await addPeople(tx, type, oct7, 2025, [{ name: "Old Winner", usd: 5000, reachedAt: "2025-10-07T09:00:00-04:00" }]);

      const home = await getHomepageData(tx, NOON_OCT_7);

      expect(home.today).toEqual(oct7);
      expect(home.leader?.name).toBe("Jess Moreno");
      expect(home.leader?.rank).toBe(1);
      expect(home.theme).toBe("lime");
      expect(home.otherTotalsCents).toEqual([22_500, 15_000, 15_000]);
      expect(home.others.count).toBe(3);
      expect(home.others.preview.map((e) => [e.rank, e.name])).toEqual([
        [2, "Tyler Brooks"],
        [3, "Ana Reyes"],
        [4, "Sam Ortiz"],
      ]);
    });
  });

  it("counts down to midnight ET (end of today's board)", async () => {
    await inRollback(async (tx) => {
      await addBirthdayType(tx);
      const home = await getHomepageData(tx, NOON_OCT_7);
      expect(home.dayEndsAt).toBe("2026-10-08T04:00:00.000Z");
      expect(home.serverNow).toBe(NOON_OCT_7.toISOString());
    });
  });

  it("shows 'nobody yet' on Butter when today has no bids", async () => {
    await inRollback(async (tx) => {
      await addBirthdayType(tx);
      const home = await getHomepageData(tx, NOON_OCT_7);
      expect(home.leader).toBeNull();
      expect(home.theme).toBe("butter");
      expect(home.others).toEqual({ count: 0, preview: [] });
    });
  });

  it("lists the next 4 days with their leader or as unclaimed", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      await addPeople(tx, type, { month: 10, day: 8 }, 2026, [
        { name: "Marcus Thompson", usd: 85, reachedAt: "2026-10-06T10:00:00-04:00" },
        { name: "Someone Else", usd: 20, reachedAt: "2026-10-06T11:00:00-04:00" },
      ]);
      await addPeople(tx, type, { month: 10, day: 10 }, 2026, [
        { name: "Dev Nolan", usd: 12, reachedAt: "2026-10-06T10:00:00-04:00" },
      ]);

      const home = await getHomepageData(tx, NOON_OCT_7);
      expect(home.comingUp).toEqual([
        { md: { month: 10, day: 8 }, leaderName: "Marcus Thompson", topTotalCents: 8_500 },
        { md: { month: 10, day: 9 }, leaderName: null, topTotalCents: null },
        { md: { month: 10, day: 10 }, leaderName: "Dev Nolan", topTotalCents: 1_200 },
        { md: { month: 10, day: 11 }, leaderName: null, topTotalCents: null },
      ]);
    });
  });

  it("switches to the new day at midnight ET, and the passed date opens next year", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      await addPeople(tx, type, oct7, 2026, [{ name: "Jess Moreno", usd: 240, reachedAt: "2026-10-07T11:00:00-04:00" }]);
      const justAfterMidnight = new Date("2026-10-08T00:00:01-04:00");

      const home = await getHomepageData(tx, justAfterMidnight);
      expect(home.today).toEqual({ month: 10, day: 8 });
      expect(home.leader).toBeNull();

      // Oct 7 now points at the empty 2027 board, not Jess's closed 2026 one.
      const { typeId, settings } = await getBirthdaySettings(tx);
      const oct7Board = await getCurrentBoard(tx, typeId, settings, oct7, justAfterMidnight);
      expect(oct7Board.year).toBe(2027);
      expect(oct7Board.entries).toEqual([]);
    });
  });
});

describe("birthday reminder signup", () => {
  it("saves the reminder with a lowercased email", async () => {
    await inRollback(async (tx) => {
      const result = await saveReminder(tx, { month: "3", day: "14", email: "You@Email.com" });
      expect(result).toEqual({ status: "ok", message: "You're set. We'll email you a week before March 14." });
      const rows = await tx.select().from(reminders);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ email: "you@email.com", month: 3, day: 14, source: "signup" });
    });
  });

  it("signing up twice keeps one row and re-subscribes", async () => {
    await inRollback(async (tx) => {
      await saveReminder(tx, { month: "3", day: "14", email: "you@email.com" });
      await tx.update(reminders).set({ unsubscribedAt: new Date() }).where(eq(reminders.email, "you@email.com"));
      await saveReminder(tx, { month: "3", day: "14", email: "YOU@email.com" });
      const rows = await tx.select().from(reminders);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.unsubscribedAt).toBeNull();
    });
  });

  it("stores nothing for invalid input", async () => {
    await inRollback(async (tx) => {
      const result = await saveReminder(tx, { month: "2", day: "30", email: "you@email.com" });
      expect(result.status).toBe("error");
      expect(await tx.select().from(reminders)).toHaveLength(0);
    });
  });
});
