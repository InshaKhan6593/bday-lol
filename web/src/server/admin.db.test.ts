import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { entries, famousPeople, leaderLog, outbidAlerts, payments } from "@/db/schema";
import type { ValidListing } from "@/lib/claim";
import { addBirthdayType, addPeople, inRollback, type Tx } from "@/test/db";
import { paidBoost, paidClaim } from "@/test/money";
import {
  ADMIN_PAGE_SIZE,
  countAdminEntries,
  lastAdminPage,
  addCompedEntry,
  compedAmountError,
  getCompedAmounts,
  getRevenue,
  listAdminEntries,
  listAdminFamous,
  paidCents,
  setCompedAmount,
  setEntryStatus,
  setFamousHidden,
  updateListing,
} from "./admin";
import { getFamousPeople } from "./famous";
import { getBirthdaySettings, getRankedEntries } from "./leaderboard";
import { getBoardVersion } from "./live";

const ET = "America/New_York";
const NOON = new Date("2026-10-07T12:00:00-04:00");
const LATER = new Date("2026-10-07T13:00:00-04:00");
const oct7 = { month: 10, day: 7 };

const listing = (name: string, over: Partial<ValidListing> = {}): ValidListing => ({
  name,
  bio: "",
  giftLinks: [],
  theme: "mint",
  isMinor: false,
  ...over,
});

async function board3(tx: Tx) {
  const type = await addBirthdayType(tx);
  const board = await addPeople(tx, type, oct7, 2026, [
    { name: "Jess Moreno", usd: 240, reachedAt: "2026-10-07T11:00:00-04:00" },
    { name: "Tyler Brooks", usd: 225, reachedAt: "2026-10-07T09:00:00-04:00" },
    { name: "Ana Reyes", usd: 150, reachedAt: "2026-10-07T08:00:00-04:00" },
  ]);
  const ranked = await getRankedEntries(tx, board.id);
  const [jess, tyler, ana] = ranked;
  // The board already has its #1 on record, as it would after real payments.
  await tx.insert(leaderLog).values({ boardId: board.id, entryId: jess!.id, startedAt: new Date("2026-10-07T11:00:00-04:00") });
  return { type, board, jess: jess!, tyler: tyler!, ana: ana! };
}

const openLeader = async (tx: Tx, boardId: string) =>
  (await tx.select({ entryId: leaderLog.entryId }).from(leaderLog).where(and(eq(leaderLog.boardId, boardId), isNull(leaderLog.endedAt))))[0]
    ?.entryId ?? null;

const names = async (tx: Tx, boardId: string) => (await getRankedEntries(tx, boardId)).map((e) => e.name);

describe("admin: listings", () => {
  it("lists a date's board in rank order, removed listings last and unranked, never unpaid claims", async () => {
    await inRollback(async (tx) => {
      const { board, ana } = await board3(tx);
      await tx.insert(entries).values({ publicId: "pending001", boardId: board.id, name: "Not Paid", theme: "sky", status: "pending" });
      await setEntryStatus(tx, ana.id, "removed", NOON);

      const rows = await listAdminEntries(tx, { key: "10-07" }, NOON);
      expect(rows.map((r) => [r.name, r.rank, r.status])).toEqual([
        ["Jess Moreno", 1, "live"],
        ["Tyler Brooks", 2, "live"],
        ["Ana Reyes", null, "removed"],
      ]);
      expect(rows[0]).toMatchObject({ boardKey: "10-07", year: 2026, totalCents: 24_000, isComped: false });
    });
  });

  it("finds people by part of their name on any date, and can show one status only", async () => {
    await inRollback(async (tx) => {
      const { type, tyler } = await board3(tx);
      await addPeople(tx, type, { month: 12, day: 25 }, 2026, [{ name: "Tyra Banks-Lee", usd: 30, reachedAt: "2026-10-01T09:00:00-04:00" }]);
      await setEntryStatus(tx, tyler.id, "removed", NOON);

      expect((await listAdminEntries(tx, { q: "ty" }, NOON)).map((r) => r.name).sort()).toEqual(["Tyler Brooks", "Tyra Banks-Lee"]);
      expect((await listAdminEntries(tx, { q: "ty", status: "live" }, NOON)).map((r) => r.name)).toEqual(["Tyra Banks-Lee"]);
      expect((await listAdminEntries(tx, { status: "removed" }, NOON)).map((r) => r.name)).toEqual(["Tyler Brooks"]);
      // A "%" typed in the search box is a character, not a wildcard.
      expect(await listAdminEntries(tx, { q: "%" }, NOON)).toEqual([]);
    });
  });

  it("pages through a long board 50 at a time: every listing once, in rank order", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      // 120 people; many share a total, so only the tie-break keeps the pages apart.
      await addPeople(
        tx,
        type,
        oct7,
        2026,
        Array.from({ length: 120 }, (_, i) => ({ name: `Person ${String(i + 1).padStart(3, "0")}`, usd: 5 + (i % 4), reachedAt: "2026-10-07T08:00:00-04:00" })),
      );
      const filter = { key: "10-07" };
      expect(await countAdminEntries(tx, filter, NOON)).toBe(120);
      expect(lastAdminPage(120)).toBe(3);

      const pages = [];
      for (const page of [1, 2, 3, 4]) pages.push(await listAdminEntries(tx, { ...filter, page }, NOON));
      expect(pages.map((p) => p.length)).toEqual([ADMIN_PAGE_SIZE, ADMIN_PAGE_SIZE, 20, 0]);
      const all = pages.flat();
      expect(new Set(all.map((e) => e.id)).size).toBe(120);
      expect(all.map((e) => e.rank)).toEqual(Array.from({ length: 120 }, (_, i) => i + 1));
      // The first page is what you get without asking for one.
      expect((await listAdminEntries(tx, filter, NOON)).map((e) => e.id)).toEqual(pages[0]!.map((e) => e.id));
    });
  });

  it("counts what the search matches, and an empty result has one (empty) page", async () => {
    await inRollback(async (tx) => {
      const { tyler } = await board3(tx);
      await setEntryStatus(tx, tyler.id, "removed", NOON);
      expect(await countAdminEntries(tx, {}, NOON)).toBe(3);
      expect(await countAdminEntries(tx, { status: "live" }, NOON)).toBe(2);
      expect(await countAdminEntries(tx, { q: "ana" }, NOON)).toBe(1);
      expect(await countAdminEntries(tx, { key: "12-25" }, NOON)).toBe(0);
      expect(lastAdminPage(0)).toBe(1);
      expect(lastAdminPage(50)).toBe(1);
      expect(lastAdminPage(51)).toBe(2);
    });
  });

  it("only shows boards that are open now, not last year's", async () => {
    await inRollback(async (tx) => {
      const { type } = await board3(tx);
      await addPeople(tx, type, oct7, 2025, [{ name: "Old Winner", usd: 500, reachedAt: "2025-10-07T09:00:00-04:00" }]);
      expect((await listAdminEntries(tx, { key: "10-07" }, NOON)).map((r) => r.name)).not.toContain("Old Winner");
    });
  });

  it("taking down #1 hands the homepage to #2 and records it, without an outbid email", async () => {
    await inRollback(async (tx) => {
      const { board, jess, tyler } = await board3(tx);
      const result = await setEntryStatus(tx, jess.id, "removed", NOON);

      expect(result).toEqual({ ok: true, change: { boardKey: "10-07", boardId: board.id } });
      expect(await names(tx, board.id)).toEqual(["Tyler Brooks", "Ana Reyes"]);
      expect(await openLeader(tx, board.id)).toBe(tyler.id);
      expect(await tx.select().from(outbidAlerts)).toEqual([]);
    });
  });

  it("taking down someone below #1 leaves the #1 record alone", async () => {
    await inRollback(async (tx) => {
      const { board, jess, ana } = await board3(tx);
      await setEntryStatus(tx, ana.id, "removed", NOON);
      const log = await tx.select().from(leaderLog).where(eq(leaderLog.boardId, board.id));
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({ entryId: jess.id, endedAt: null });
    });
  });

  it("taking down the last person leaves a board with no #1", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await addPeople(tx, type, oct7, 2026, [{ name: "Only One", usd: 5, reachedAt: "2026-10-07T08:00:00-04:00" }]);
      const [only] = await getRankedEntries(tx, board.id);
      await tx.insert(leaderLog).values({ boardId: board.id, entryId: only!.id, startedAt: NOON });

      await setEntryStatus(tx, only!.id, "removed", LATER);
      expect(await names(tx, board.id)).toEqual([]);
      expect(await openLeader(tx, board.id)).toBeNull();
    });
  });

  it("putting #1 back returns the homepage to them and tells whoever held it meanwhile", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await addPeople(tx, type, oct7, 2026, []);
      const jess = await paidClaim(tx, board.id, { md: oct7, name: "Jess Moreno", usd: 240, email: "jess@example.com", at: NOON });
      const tyler = await paidClaim(tx, board.id, { md: oct7, name: "Tyler Brooks", usd: 225, email: "tyler@example.com", at: NOON });

      await setEntryStatus(tx, jess.entryId, "removed", LATER);
      expect(await openLeader(tx, board.id)).toBe(tyler.entryId);
      await setEntryStatus(tx, jess.entryId, "live", LATER);

      expect(await names(tx, board.id)).toEqual(["Jess Moreno", "Tyler Brooks"]);
      expect(await openLeader(tx, board.id)).toBe(jess.entryId);
      expect((await tx.select().from(outbidAlerts)).map((a) => [a.entryId, a.email])).toEqual([[tyler.entryId, "tyler@example.com"]]);
    });
  });

  it("is safe to repeat, refuses an unpaid claim and a listing that doesn't exist", async () => {
    await inRollback(async (tx) => {
      const { board, ana } = await board3(tx);
      await setEntryStatus(tx, ana.id, "removed", NOON);
      expect((await setEntryStatus(tx, ana.id, "removed", NOON)).ok).toBe(true);
      const [unpaid] = await tx
        .insert(entries)
        .values({ publicId: "pending002", boardId: board.id, name: "Not Paid", theme: "sky", status: "pending" })
        .returning({ id: entries.id });
      expect(await setEntryStatus(tx, unpaid!.id, "live", NOON)).toMatchObject({ ok: false });
      expect(await setEntryStatus(tx, "00000000-0000-4000-8000-000000000000", "removed", NOON)).toMatchObject({ ok: false });
    });
  });

  it("saves an edit, keeps the personal link, and changes the board's version", async () => {
    await inRollback(async (tx) => {
      const { jess } = await board3(tx);
      const { typeId, settings } = await getBirthdaySettings(tx);
      const before = await getBoardVersion(tx, typeId, settings, oct7, NOON);

      const edit = listing("Jessica Moreno", { bio: "Turning 30", theme: "lime", giftLinks: [{ service: "venmo", url: "https://venmo.com/u/jess" }] });
      expect((await updateListing(tx, jess.id, { ...edit, photoUrl: "/uploads/new.jpg" })).ok).toBe(true);

      const [saved] = await tx.select().from(entries).where(eq(entries.id, jess.id));
      expect(saved).toMatchObject({ name: "Jessica Moreno", bio: "Turning 30", theme: "lime", photoUrl: "/uploads/new.jpg", slug: "jess-moreno" });
      expect(saved!.giftLinks).toEqual(edit.giftLinks);
      expect(await getBoardVersion(tx, typeId, settings, oct7, LATER)).not.toBe(before);
    });
  });

  it("keeps the photo unless told otherwise, and can remove it", async () => {
    await inRollback(async (tx) => {
      const { jess } = await board3(tx);
      await tx.update(entries).set({ photoUrl: "/uploads/a.jpg" }).where(eq(entries.id, jess.id));
      await updateListing(tx, jess.id, listing("Jess Moreno"));
      expect((await tx.select().from(entries).where(eq(entries.id, jess.id)))[0]!.photoUrl).toBe("/uploads/a.jpg");
      await updateListing(tx, jess.id, { ...listing("Jess Moreno"), photoUrl: null });
      expect((await tx.select().from(entries).where(eq(entries.id, jess.id)))[0]!.photoUrl).toBeNull();
    });
  });

  it("the database still refuses gift links on a child's listing", async () => {
    await inRollback(async (tx) => {
      const { jess } = await board3(tx);
      const bad = listing("Maya", { isMinor: true, giftLinks: [{ service: "venmo", url: "https://venmo.com/u/x" }] });
      await expect(tx.transaction((sp) => updateListing(sp, jess.id, bad))).rejects.toThrow();
    });
  });
});

describe("admin: comped listings", () => {
  it("goes live at once, looks like any listing, and is marked comped with a comp payment", async () => {
    await inRollback(async (tx) => {
      const { type, board } = await board3(tx);
      const result = await addCompedEntry(tx, type, { md: oct7, listing: listing("Famous Guest"), amountCents: 20_000, photoUrl: null }, NOON);
      expect(result.ok).toBe(true);

      expect(await names(tx, board.id)).toEqual(["Jess Moreno", "Tyler Brooks", "Famous Guest", "Ana Reyes"]);
      const [entry] = await tx.select().from(entries).where(eq(entries.id, result.entryId!));
      expect(entry).toMatchObject({ status: "live", isComped: true, totalCents: 20_000, slug: "famous-guest", liveAt: NOON, ownerEmail: null });
      const [payment] = await tx.select().from(payments).where(eq(payments.entryId, result.entryId!));
      expect(payment).toMatchObject({ kind: "comp", status: "paid", amountCents: 20_000, stripeSessionId: null, paidAt: NOON });
    });
  });

  it("a comped listing that takes #1 gets the homepage, and the person passed is told", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await addPeople(tx, type, oct7, 2026, []);
      const jess = await paidClaim(tx, board.id, { md: oct7, name: "Jess Moreno", usd: 240, email: "jess@example.com", at: NOON });

      const result = await addCompedEntry(tx, type, { md: oct7, listing: listing("Famous Guest"), amountCents: 50_000, photoUrl: null }, LATER);
      expect(await openLeader(tx, board.id)).toBe(result.entryId);
      expect((await tx.select().from(outbidAlerts)).map((a) => a.entryId)).toEqual([jess.entryId]);
    });
  });

  it("opens the date's board when nobody has claimed it yet, on next year's board once the date has passed", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const result = await addCompedEntry(tx, type, { md: { month: 10, day: 1 }, listing: listing("Early Bird"), amountCents: 500, photoUrl: null }, NOON);
      const [row] = await listAdminEntries(tx, { key: "10-01" }, NOON);
      expect(row).toMatchObject({ name: "Early Bird", year: 2027, rank: 1, isComped: true });
      expect(result.ok && (await openLeader(tx, result.change.boardId))).toBe(result.entryId);
    });
  });

  it("two comped people with the same name get different personal links", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const a = await addCompedEntry(tx, type, { md: oct7, listing: listing("Sam Rivera"), amountCents: 500, photoUrl: null }, NOON);
      const b = await addCompedEntry(tx, type, { md: oct7, listing: listing("Sam Rivera"), amountCents: 500, photoUrl: null }, LATER);
      const slugs = await Promise.all([a, b].map(async (r) => (await tx.select().from(entries).where(eq(entries.id, r.entryId!)))[0]!.slug));
      expect(slugs).toEqual(["sam-rivera", "sam-rivera-2"]);
    });
  });

  it("only accepts whole dollars from $1", () => {
    expect(compedAmountError(100)).toBeNull();
    expect(compedAmountError(24_000)).toBeNull();
    for (const bad of [0, 50, 150, -100, 1.5, Number.NaN, 100_000_100]) expect(compedAmountError(bad), String(bad)).not.toBeNull();
  });

  it("refuses a bad amount without touching the board", async () => {
    await inRollback(async (tx) => {
      const { type, board } = await board3(tx);
      expect(await addCompedEntry(tx, type, { md: oct7, listing: listing("X"), amountCents: 150, photoUrl: null }, NOON)).toMatchObject({ ok: false });
      expect(await names(tx, board.id)).toHaveLength(3);
    });
  });

  it("changing a comped amount re-ranks the board and keeps boosts people paid on top", async () => {
    await inRollback(async (tx) => {
      const { type, board, jess } = await board3(tx);
      const comped = await addCompedEntry(tx, type, { md: oct7, listing: listing("Famous Guest"), amountCents: 20_000, photoUrl: null }, NOON);
      await paidBoost(tx, comped.entryId!, { usd: 10, email: "fan@example.com", at: NOON });

      expect((await setCompedAmount(tx, comped.entryId!, 30_000, LATER)).ok).toBe(true);
      const [entry] = await tx.select().from(entries).where(eq(entries.id, comped.entryId!));
      expect(entry!.totalCents).toBe(31_000);
      expect(await names(tx, board.id)).toEqual(["Famous Guest", "Jess Moreno", "Tyler Brooks", "Ana Reyes"]);
      expect(await openLeader(tx, board.id)).toBe(comped.entryId);
      expect(await getCompedAmounts(tx, [comped.entryId!, jess.id])).toEqual({ [comped.entryId!]: 30_000 });
    });
  });

  it("never changes what someone paid", async () => {
    await inRollback(async (tx) => {
      const { jess } = await board3(tx);
      expect(await setCompedAmount(tx, jess.id, 100, NOON)).toMatchObject({ ok: false });
      expect((await tx.select().from(entries).where(eq(entries.id, jess.id)))[0]!.totalCents).toBe(24_000);
    });
  });
});

describe("admin: famous people", () => {
  const person = (sourceId: string, name: string, rank: number) => ({
    key: "10-07",
    sourceId,
    name,
    knownFor: "English TV judge",
    birthDate: "1959-10-07",
    rank,
  });

  it("hides a person so the next name moves up, and shows them again", async () => {
    await inRollback(async (tx) => {
      await tx.insert(famousPeople).values([person("Q1", "Simon Cowell", 1), person("Q2", "Toni Braxton", 2), person("Q3", "Thom Yorke", 3)]);

      expect(await setFamousHidden(tx, { source: "wikidata", sourceId: "Q1" }, true)).toEqual({ ok: true });
      expect((await getFamousPeople(tx, oct7, 2027)).map((p) => p.name)).toEqual(["Toni Braxton", "Thom Yorke"]);
      expect((await listAdminFamous(tx, oct7)).map((p) => [p.name, p.hidden])).toEqual([
        ["Simon Cowell", true],
        ["Toni Braxton", false],
        ["Thom Yorke", false],
      ]);
      // Hiding twice is fine.
      expect(await setFamousHidden(tx, { source: "wikidata", sourceId: "Q1" }, true)).toEqual({ ok: true });

      await setFamousHidden(tx, { source: "wikidata", sourceId: "Q1" }, false);
      expect((await getFamousPeople(tx, oct7, 2027)).map((p) => p.name)).toEqual(["Simon Cowell", "Toni Braxton", "Thom Yorke"]);
    });
  });

  it("refuses to hide someone who isn't on any list", async () => {
    await inRollback(async (tx) => {
      expect(await setFamousHidden(tx, { source: "wikidata", sourceId: "Q404" }, true)).toMatchObject({ ok: false });
    });
  });
});

describe("admin: revenue", () => {
  it("adds up paid claims and boosts by Eastern day and month, with comped listings apart", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await addPeople(tx, type, oct7, 2026, []);
      const jess = await paidClaim(tx, board.id, { md: oct7, name: "Jess", usd: 240, email: "j@example.com", at: NOON });
      await paidBoost(tx, jess.entryId, { usd: 5, email: "fan@example.com", at: NOON });
      // 11:30 PM ET on Oct 7 is Oct 8 in UTC: it still belongs to Oct 7.
      await paidBoost(tx, jess.entryId, { usd: 10, email: "fan@example.com", at: new Date("2026-10-07T23:30:00-04:00") });
      await paidClaim(tx, board.id, { md: oct7, name: "Sep Claim", usd: 20, email: "s@example.com", at: new Date("2026-09-30T12:00:00-04:00") });
      await addCompedEntry(tx, type, { md: oct7, listing: listing("Famous Guest"), amountCents: 50_000, photoUrl: null }, NOON);
      // Not money: a checkout nobody finished.
      await tx.insert(entries).values({ id: "11111111-1111-4111-8111-111111111111", publicId: "pending003", boardId: board.id, name: "Not Paid", theme: "sky", status: "pending" });
      await tx.insert(payments).values({ entryId: "11111111-1111-4111-8111-111111111111", kind: "claim", status: "pending", amountCents: 99_900, stripeSessionId: "cs_test_unpaid" });

      const revenue = await getRevenue(tx, new Date("2026-10-08T09:00:00-04:00"), ET);

      const oct7Row = revenue.days.find((d) => d.period === "2026-10-07");
      expect(oct7Row).toEqual({ period: "2026-10-07", claimsCents: 24_000, claims: 1, boostsCents: 1_500, boosts: 2, compedCents: 50_000, comped: 1 });
      expect(paidCents(oct7Row!)).toBe(25_500);
      expect(revenue.days.find((d) => d.period === "2026-10-08")).toBeUndefined();
      expect(revenue.months.map((m) => [m.period, paidCents(m)])).toEqual([
        ["2026-10", 25_500],
        ["2026-09", 2_000],
      ]);
      expect(paidCents(revenue.allTime)).toBe(27_500);
      expect(revenue.allTime.compedCents).toBe(50_000);
    });
  });

  it("is all zeros before the first payment", async () => {
    await inRollback(async (tx) => {
      const revenue = await getRevenue(tx, NOON, ET);
      expect(revenue.days).toEqual([]);
      expect(revenue.months).toEqual([]);
      expect(paidCents(revenue.allTime)).toBe(0);
    });
  });
});
