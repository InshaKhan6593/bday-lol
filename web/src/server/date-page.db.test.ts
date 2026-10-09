import { describe, expect, it } from "vitest";
import { entries, famousHidden, famousPeople, leaderLog } from "@/db/schema";
import { addBirthdayType, addPeople, inRollback } from "@/test/db";
import { getDatePageData } from "./date-page";

// Noon ET on October 7, 2026.
const NOON_OCT_7 = new Date("2026-10-07T12:00:00-04:00");
const oct7 = { month: 10, day: 7 };
const oct10 = { month: 10, day: 10 };
const oct1 = { month: 10, day: 1 };

describe("date page data", () => {
  it("ranks the viewed date and paints the page in the #1's theme", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      await addPeople(tx, type, oct10, 2026, [
        { name: "Ana Reyes", usd: 150, reachedAt: "2026-10-05T08:00:00-04:00", theme: "apricot" },
        { name: "Priya Shah", usd: 410, reachedAt: "2026-10-05T09:00:00-04:00", theme: "orchid" },
        { name: "Hidden Person", usd: 999, reachedAt: "2026-10-05T07:00:00-04:00", status: "removed" },
      ]);

      const page = await getDatePageData(tx, oct10, NOON_OCT_7);
      expect(page.status).toEqual({ kind: "soon", days: 3 });
      expect(page.year).toBe(2026);
      expect(page.theme).toBe("orchid");
      expect(page.entries.map((e) => [e.rank, e.name, e.totalCents])).toEqual([
        [1, "Priya Shah", 41_000],
        [2, "Ana Reyes", 15_000],
      ]);
      // Internal ids never leave the server.
      expect(Object.keys(page.entries[0]!)).not.toContain("id");
    });
  });

  it("uses Cloud for an empty date and Butter for today's cell when today is empty too", async () => {
    await inRollback(async (tx) => {
      await addBirthdayType(tx);
      const page = await getDatePageData(tx, oct10, NOON_OCT_7);
      expect(page.entries).toEqual([]);
      expect(page.theme).toBe("cloud");
      expect(page.todayTheme).toBe("butter");
    });
  });

  it("shows a passed date's new (next year) board, not this year's closed one", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      await addPeople(tx, type, oct1, 2026, [{ name: "Old Winner", usd: 500, reachedAt: "2026-09-01T09:00:00-04:00" }]);
      await addPeople(tx, type, oct1, 2027, [{ name: "Early Bird", usd: 20, reachedAt: "2026-10-02T09:00:00-04:00" }]);

      const page = await getDatePageData(tx, oct1, NOON_OCT_7);
      expect(page.status).toEqual({ kind: "next", year: 2027 });
      expect(page.entries.map((e) => e.name)).toEqual(["Early Bird"]);
      expect(page.calendarTops["10-01"]).toBe(2_000);
    });
  });

  it("builds held lines from the #1 log, on today's board only", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await addPeople(tx, type, oct7, 2026, [
        { name: "Jess Moreno", usd: 240, reachedAt: "2026-10-07T14:40:00-04:00", theme: "lime" },
        { name: "Tyler Brooks", usd: 225, reachedAt: "2026-10-07T09:12:00-04:00" },
        { name: "Ana Reyes", usd: 150, reachedAt: "2026-10-07T00:00:00-04:00" },
        { name: "Chris Wu", usd: 60, reachedAt: "2026-10-07T10:00:00-04:00" },
      ]);
      const ids = Object.fromEntries((await tx.select().from(entries)).map((e) => [e.name, e.id]));
      await tx.insert(leaderLog).values([
        { boardId: board.id, entryId: ids["Ana Reyes"]!, startedAt: new Date("2026-10-07T00:00:00-04:00"), endedAt: new Date("2026-10-07T09:12:00-04:00") },
        { boardId: board.id, entryId: ids["Tyler Brooks"]!, startedAt: new Date("2026-10-07T09:12:00-04:00"), endedAt: new Date("2026-10-07T14:40:00-04:00") },
        { boardId: board.id, entryId: ids["Jess Moreno"]!, startedAt: new Date("2026-10-07T14:40:00-04:00") },
      ]);

      const page = await getDatePageData(tx, oct7, NOON_OCT_7);
      expect(page.status).toEqual({ kind: "today" });
      expect(page.todayTheme).toBe("lime");
      expect(page.entries.map((e) => e.held)).toEqual([
        "On the homepage since 2:40 PM",
        "Held the homepage 9:12 AM – 2:40 PM",
        "Held the homepage 12:00 AM – 9:12 AM",
        null,
      ]);
      expect(page.dayEndsAt).toBe("2026-10-08T04:00:00.000Z");

      // Viewed from another date: today's #1 still colors today's calendar cell.
      const other = await getDatePageData(tx, oct10, NOON_OCT_7);
      expect(other.todayTheme).toBe("lime");
    });
  });

  it("gives the date picker each open board's top total, ignoring closed and unpaid entries", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      await addPeople(tx, type, oct7, 2026, [
        { name: "Jess Moreno", usd: 240, reachedAt: "2026-10-07T11:00:00-04:00" },
        { name: "Pending Person", usd: 900, reachedAt: "2026-10-07T07:00:00-04:00", status: "pending" },
      ]);
      // Last year's Oct 7 board is closed.
      await addPeople(tx, type, oct7, 2025, [{ name: "Old Winner", usd: 5000, reachedAt: "2025-10-07T09:00:00-04:00" }]);
      await addPeople(tx, type, { month: 2, day: 29 }, 2028, [
        { name: "Leap Kid", usd: 29, reachedAt: "2026-05-01T09:00:00-04:00" },
      ]);

      const page = await getDatePageData(tx, oct10, NOON_OCT_7);
      expect(page.calendarTops).toEqual({ "10-07": 24_000, "02-29": 2_900 });
    });
  });

  it("lists famous people best known first, skips hidden ones, and computes this year's age", async () => {
    await inRollback(async (tx) => {
      await addBirthdayType(tx);
      const person = (rank: number, name: string, birthDate: string) => ({
        key: "10-07", sourceId: `Q${rank}`, name, knownFor: "singer", birthDate, rank,
      });
      await tx.insert(famousPeople).values([
        person(2, "Toni Braxton", "1967-10-07"),
        person(1, "Simon Cowell", "1959-10-07"),
        person(3, "Hidden Star", "1980-10-07"),
        { ...person(1, "Other Day", "1990-10-08"), key: "10-08", sourceId: "Q99" },
      ]);
      await tx.insert(famousHidden).values({ sourceId: "Q3", name: "Hidden Star" });

      const page = await getDatePageData(tx, oct7, NOON_OCT_7);
      expect(page.famous).toEqual([
        { name: "Simon Cowell", knownFor: "singer", age: 67 },
        { name: "Toni Braxton", knownFor: "singer", age: 59 },
      ]);
    });
  });
});
