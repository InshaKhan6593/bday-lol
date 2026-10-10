import { describe, expect, it } from "vitest";
import { famousHidden } from "@/db/schema";
import type { FamousRecord } from "@/lib/famous";
import { inRollback } from "@/test/db";
import { getFamousPeople, refreshFamousMonth } from "./famous";
import type { FamousBirthdaysProvider } from "./famous-source";

const NOON = new Date("2026-10-07T12:00:00-04:00");
const oct7 = { month: 10, day: 7 };
const oct8 = { month: 10, day: 8 };

const person = (sourceId: string, name: string, rank: number, birthDate = "1959-10-07"): FamousRecord => ({
  sourceId,
  name,
  knownFor: "English television personality",
  birthDate,
  pageviews: 1000 - rank,
  rank,
});

/** A provider that returns whatever the test says, like Wikidata would. */
const fake = (data: Record<string, FamousRecord[]>): FamousBirthdaysProvider => ({
  source: "wikidata",
  fetchMonth: async () => new Map(Object.entries(data)),
});

describe("famous people refresh", () => {
  it("stores the ranked list and shows the age turned on this date in the board's year", async () => {
    await inRollback(async (tx) => {
      const run = await refreshFamousMonth(
        tx,
        fake({ "10-07": [person("Q1", "Simon Cowell", 1), person("Q2", "Yo-Yo Ma", 2, "1955-10-07")] }),
        10,
        NOON,
      );
      expect(run).toEqual({ dates: 1, people: 2 });
      expect(await getFamousPeople(tx, oct7, 2026)).toEqual([
        { sourceId: "Q1", source: "wikidata", name: "Simon Cowell", knownFor: "English television personality", age: 67, birthDate: "1959-10-07" },
        { sourceId: "Q2", source: "wikidata", name: "Yo-Yo Ma", knownFor: "English television personality", age: 71, birthDate: "1955-10-07" },
      ]);
    });
  });

  it("replaces a date's list on the next refresh", async () => {
    await inRollback(async (tx) => {
      await refreshFamousMonth(tx, fake({ "10-07": [person("Q1", "Old Name", 1)] }), 10, NOON);
      await refreshFamousMonth(tx, fake({ "10-07": [person("Q9", "New Name", 1)] }), 10, NOON);
      expect((await getFamousPeople(tx, oct7, 2026)).map((p) => p.name)).toEqual(["New Name"]);
    });
  });

  it("keeps last month's list for a date the provider couldn't fetch", async () => {
    await inRollback(async (tx) => {
      await refreshFamousMonth(
        tx,
        fake({ "10-07": [person("Q1", "Kept", 1)], "10-08": [person("Q2", "Old", 1, "1990-10-08")] }),
        10,
        NOON,
      );
      // October 7 failed this time: only October 8 comes back.
      await refreshFamousMonth(tx, fake({ "10-08": [person("Q3", "New", 1, "1991-10-08")] }), 10, NOON);
      expect((await getFamousPeople(tx, oct7, 2026)).map((p) => p.name)).toEqual(["Kept"]);
      expect((await getFamousPeople(tx, oct8, 2026)).map((p) => p.name)).toEqual(["New"]);
    });
  });

  it("keeps hidden people hidden across refreshes, and the next name moves up", async () => {
    await inRollback(async (tx) => {
      const list = { "10-07": [person("Q1", "Hidden One", 1), person("Q2", "Next Up", 2)] };
      await tx.insert(famousHidden).values({ source: "wikidata", sourceId: "Q1", name: "Hidden One" });
      await refreshFamousMonth(tx, fake(list), 10, NOON);
      await refreshFamousMonth(tx, fake(list), 10, NOON);
      expect((await getFamousPeople(tx, oct7, 2026)).map((p) => p.name)).toEqual(["Next Up"]);
    });
  });

  it("reads at most 15 (10 listed, 5 named in a line), best known first", async () => {
    await inRollback(async (tx) => {
      const many = Array.from({ length: 20 }, (_, i) => person(`Q${i + 1}`, `Person ${i + 1}`, i + 1));
      await refreshFamousMonth(tx, fake({ "10-07": many }), 10, NOON);
      const shown = await getFamousPeople(tx, oct7, 2026);
      expect(shown).toHaveLength(15);
      expect(shown[14]!.name).toBe("Person 15");
    });
  });
});
