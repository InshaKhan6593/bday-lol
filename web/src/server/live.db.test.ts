import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { entries } from "@/db/schema";
import { boardVersion } from "@/lib/live";
import { addBirthdayType, addPeople, inRollback, type Tx } from "@/test/db";
import { paidBoost, paidClaim } from "@/test/money";
import { getDatePageData } from "./date-page";
import { getHomepageData } from "./homepage";
import { getBirthdaySettings, getCurrentBoard } from "./leaderboard";
import { announceBoardChange, getBoardVersion } from "./live";

const NOON_OCT_7 = new Date("2026-10-07T12:00:00-04:00");
const oct7 = { month: 10, day: 7 };

async function version(tx: Tx, md = oct7, at = NOON_OCT_7) {
  const { typeId, settings } = await getBirthdaySettings(tx);
  return getBoardVersion(tx, typeId, settings, md, at);
}

describe("board version", () => {
  it("is 'open' for a date nobody has claimed", async () => {
    await inRollback(async (tx) => {
      await addBirthdayType(tx);
      expect(await version(tx)).toBe("open");
    });
  });

  it("is the version the homepage and the date page are drawn with", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      await addPeople(tx, type, oct7, 2026, [
        { name: "Jess Moreno", usd: 240, reachedAt: "2026-10-07T11:00:00-04:00" },
        { name: "Tyler Brooks", usd: 225, reachedAt: "2026-10-07T09:00:00-04:00" },
        { name: "Pending Person", usd: 500, reachedAt: "2026-10-07T07:00:00-04:00", status: "pending" },
      ]);
      const remote = await version(tx);
      expect((await getHomepageData(tx, NOON_OCT_7)).version).toBe(remote);
      expect((await getDatePageData(tx, oct7, NOON_OCT_7)).version).toBe(remote);
      // An empty date agrees too.
      const oct9 = { month: 10, day: 9 };
      expect((await getDatePageData(tx, oct9, NOON_OCT_7)).version).toBe(await version(tx, oct9));
    });
  });

  it("changes with a claim and with a boost", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await addPeople(tx, type, oct7, 2026, [
        { name: "Jess Moreno", usd: 240, reachedAt: "2026-10-07T11:00:00-04:00" },
      ]);
      const before = await version(tx);

      const claim = await paidClaim(tx, board.id, { md: oct7, name: "Sam Rivera", usd: 50, email: "sam@example.com", at: NOON_OCT_7 });
      const afterClaim = await version(tx);
      expect(afterClaim).not.toBe(before);

      await paidBoost(tx, claim.entryId, { usd: 5, email: "fan@example.com", at: new Date(NOON_OCT_7.getTime() + 60_000) });
      expect(await version(tx)).not.toBe(afterClaim);
    });
  });

  it("ignores a claim that hasn't been paid", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await addPeople(tx, type, oct7, 2026, [
        { name: "Jess Moreno", usd: 240, reachedAt: "2026-10-07T11:00:00-04:00" },
      ]);
      const before = await version(tx);
      await tx.insert(entries).values({ publicId: "pending01", boardId: board.id, name: "Not Paid", theme: "sky", status: "pending" });
      expect(await version(tx)).toBe(before);
    });
  });

  it("changes when a listing is removed, and still isn't 'open' when the last one goes", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await addPeople(tx, type, oct7, 2026, [
        { name: "Jess Moreno", usd: 240, reachedAt: "2026-10-07T11:00:00-04:00" },
      ]);
      const before = await version(tx);
      await tx.update(entries).set({ status: "removed" }).where(eq(entries.boardId, board.id));
      const after = await version(tx);
      expect(after).not.toBe(before);
      expect(after).not.toBe("open");
      // The page reads the same emptied board.
      const { typeId, settings } = await getBirthdaySettings(tx);
      const view = await getCurrentBoard(tx, typeId, settings, oct7, NOON_OCT_7);
      expect(boardVersion({ boardId: view.boardId, people: 0, totalCents: 0, lastChangedAt: null })).toBe(after);
    });
  });

  it("follows the year: after the date passes it is next year's (empty) board", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      await addPeople(tx, type, oct7, 2026, [{ name: "Jess Moreno", usd: 240, reachedAt: "2026-10-07T11:00:00-04:00" }]);
      expect(await version(tx, oct7, NOON_OCT_7)).not.toBe("open");
      expect(await version(tx, oct7, new Date("2026-10-08T00:00:01-04:00"))).toBe("open");
    });
  });
});

describe("announcing a board change", () => {
  afterEach(() => vi.unstubAllEnvs());

  const withKeys = () => {
    vi.stubEnv("SUPABASE_URL", "https://abc.supabase.co/");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
  };

  it("does nothing without the Supabase keys (local development)", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const send = vi.fn();
    expect(await announceBoardChange("10-07", send)).toEqual({ sent: false, reason: "no Supabase keys" });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends an empty private broadcast on the board's channel with the server key", async () => {
    withKeys();
    const send = vi.fn(async () => new Response(null, { status: 202 }));
    expect(await announceBoardChange("10-07", send)).toEqual({ sent: true });
    const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://abc.supabase.co/realtime/v1/api/broadcast/board%3A10-07/events/changed?private=true");
    expect(init.method).toBe("POST");
    expect(init.body).toBe("{}");
    expect(init.headers).toMatchObject({ apikey: "service-key", Authorization: "Bearer service-key" });
  });

  it("never throws: a refused or failed send is reported, not raised", async () => {
    withKeys();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const refused = vi.fn(async () => new Response("no", { status: 401 }));
    expect(await announceBoardChange("10-07", refused)).toEqual({ sent: false, reason: "Realtime answered 401" });
    const down = vi.fn(async () => {
      throw new Error("network down");
    });
    expect(await announceBoardChange("10-07", down)).toEqual({ sent: false, reason: "network down" });
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
