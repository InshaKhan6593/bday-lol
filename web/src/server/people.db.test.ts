import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { entries } from "@/db/schema";
import { addBirthdayType, inRollback } from "@/test/db";
import { paidClaim } from "@/test/money";
import { ensureBoard } from "./boards";
import { getPersonOnBoard } from "./people";

const oct7 = { month: 10, day: 7 };
const NOON = new Date("2026-10-07T12:00:00-04:00");

describe("personal links", () => {
  it("gives each claim a link name when it goes live, -2 for the same name on the same date", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await ensureBoard(tx, type, oct7, 2026);
      const first = await paidClaim(tx, board.id, { md: oct7, name: "Lucía Gómez", usd: 5, email: "a@example.com", at: NOON });
      const second = await paidClaim(tx, board.id, { md: oct7, name: "Lucia Gomez", usd: 6, email: "b@example.com", at: NOON });

      const slugOf = async (id: string) =>
        (await tx.select({ slug: entries.slug }).from(entries).where(eq(entries.id, id)))[0]?.slug;
      expect(await slugOf(first.entryId)).toBe("lucia-gomez");
      expect(await slugOf(second.entryId)).toBe("lucia-gomez-2");

      // Another date is a separate board: the plain name is free there.
      const oct8 = await ensureBoard(tx, type, { month: 10, day: 8 }, 2026);
      const other = await paidClaim(tx, oct8.id, { md: { month: 10, day: 8 }, name: "Lucía Gómez", usd: 5, email: "c@example.com", at: NOON });
      expect(await slugOf(other.entryId)).toBe("lucia-gomez");
    });
  });

  it("finds the person a link points to on the date's current board", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await ensureBoard(tx, type, oct7, 2026);
      await paidClaim(tx, board.id, { md: oct7, name: "Jess Moreno", usd: 240, email: "j@example.com", at: NOON });
      await paidClaim(tx, board.id, { md: oct7, name: "Sam Rivera", usd: 10, email: "s@example.com", at: NOON });

      expect(await getPersonOnBoard(tx, oct7, "sam-rivera", NOON)).toMatchObject({ name: "Sam Rivera", rank: 2 });
      expect(await getPersonOnBoard(tx, oct7, "nobody", NOON)).toBeNull();
      // After October 7 ends, the link points at next year's (empty) board.
      expect(await getPersonOnBoard(tx, oct7, "sam-rivera", new Date("2026-10-08T09:00:00-04:00"))).toBeNull();
    });
  });
});
