import { randomUUID } from "node:crypto";
import { asc, eq, inArray, like } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { db } from "@/db";
import { alertSubscriptions, boardTypes, boards, entries, leaderLog, outbidAlerts, payments, reminders } from "@/db/schema";
import type { ValidClaim } from "@/lib/claim";
import { assertLocalDatabase } from "../../scripts/load-env";
import { ensureBoard } from "./boards";
import { getRankedEntries } from "./leaderboard";
import { createPendingBoost, createPendingClaim, fulfillCheckout, type FulfillResult } from "./payments";

/**
 * Many payments landing on one board at the same moment (07 B6).
 *
 * The other database tests run inside one rolled-back transaction, which is one connection, so they
 * can only take turns. These use the real pool (10 connections, like the app) and commit, so the
 * board lock, the idempotency check and the unique indexes are what keeps the result right.
 * Everything lives under a throwaway board type and is deleted afterwards: the seed data isn't touched.
 */
const RUN = randomUUID().slice(0, 8);
const EMAIL_DOMAIN = `concurrency-${RUN}.test`;
const md = { month: 10, day: 7 };
const NOON = new Date("2026-10-07T12:00:00-04:00");
const typeIds: number[] = [];

async function newBoard() {
  assertLocalDatabase();
  const [type] = await db
    .insert(boardTypes)
    .values({ ...BIRTHDAY_BOARD_TYPE, slug: `concurrency-${RUN}-${typeIds.length}` })
    .returning();
  typeIds.push(type!.id);
  return ensureBoard(db, type!, md, 2026);
}

function claim(name: string, usd: number, i: number): ValidClaim {
  return { md, amountCents: usd * 100, name, bio: "", giftLinks: [], theme: "sky", email: `p${i}@${EMAIL_DOMAIN}`, isMinor: false };
}

async function pendingClaim(boardId: string, c: ValidClaim) {
  const ids = { entryId: randomUUID(), paymentId: randomUUID() };
  const sessionId = `cs_test_${RUN}_${ids.paymentId}`;
  await createPendingClaim(db, { ids, boardId, sessionId, claim: c, photoUrl: null });
  return { ...ids, sessionId };
}

async function pendingBoost(entryId: string, usd: number) {
  const paymentId = randomUUID();
  const sessionId = `cs_test_${RUN}_${paymentId}`;
  await createPendingBoost(db, { paymentId, entryId, amountCents: usd * 100, alertOptIn: false, sessionId });
  return sessionId;
}

const paid = (sessionId: string) => ({ sessionId, presentment: null, paymentIntentId: null, paymentMethod: null, customerEmail: null });
/** Each payment a few milliseconds apart, like webhooks arriving in a burst. */
const at = (i: number) => new Date(NOON.getTime() + i * 7);
const count = (results: FulfillResult[], status: FulfillResult["status"]) => results.filter((r) => r.status === status).length;

afterAll(async () => {
  if (!typeIds.length) return;
  const boardIds = (await db.select({ id: boards.id }).from(boards).where(inArray(boards.boardTypeId, typeIds))).map((b) => b.id);
  const entryIds = boardIds.length
    ? (await db.select({ id: entries.id }).from(entries).where(inArray(entries.boardId, boardIds))).map((e) => e.id)
    : [];
  if (entryIds.length) {
    await db.delete(outbidAlerts).where(inArray(outbidAlerts.entryId, entryIds));
    await db.delete(alertSubscriptions).where(inArray(alertSubscriptions.entryId, entryIds));
    await db.delete(payments).where(inArray(payments.entryId, entryIds));
  }
  if (boardIds.length) {
    await db.delete(leaderLog).where(inArray(leaderLog.boardId, boardIds));
    await db.delete(entries).where(inArray(entries.boardId, boardIds));
    await db.delete(boards).where(inArray(boards.id, boardIds));
  }
  await db.delete(reminders).where(like(reminders.email, `%@${EMAIL_DOMAIN}`));
  await db.delete(boardTypes).where(inArray(boardTypes.id, typeIds));
});

describe("payments landing at the same time", () => {
  it("credits 60 boosts on one board exactly once each, with one #1", { timeout: 60_000 }, async () => {
    const board = await newBoard();
    // Four people already on the board.
    const people = [];
    for (const [i, usd] of [50, 40, 30, 20].entries()) {
      const p = await pendingClaim(board.id, claim(`Person ${i}`, usd, i));
      await fulfillCheckout(db, paid(p.sessionId), at(i));
      people.push({ ...p, usd });
    }
    // 60 boosts of $2–$13, spread over the four, all pending.
    const boosts = [];
    for (let i = 0; i < 60; i++) {
      const target = i % 4;
      const usd = 2 + (i % 12);
      boosts.push({ target, usd, sessionId: await pendingBoost(people[target]!.entryId, usd) });
    }

    const results = await Promise.all(boosts.map((b, i) => fulfillCheckout(db, paid(b.sessionId), at(10 + i))));
    expect(count(results, "fulfilled")).toBe(60);

    const ranked = await getRankedEntries(db, board.id);
    for (const [i, person] of people.entries()) {
      const expected = person.usd + boosts.filter((b) => b.target === i).reduce((sum, b) => sum + b.usd, 0);
      expect(ranked.find((e) => e.id === person.entryId)?.totalCents).toBe(expected * 100);
    }
    // Ranks are 1..4 with no gaps or repeats, highest total first.
    expect(ranked.map((e) => e.rank)).toEqual([1, 2, 3, 4]);
    expect([...ranked].sort((a, b) => b.totalCents - a.totalCents).map((e) => e.id)).toEqual(ranked.map((e) => e.id));

    // The #1 log has exactly one open line, and it is whoever is #1 now.
    const log = await db.select().from(leaderLog).where(eq(leaderLog.boardId, board.id)).orderBy(asc(leaderLog.startedAt));
    const open = log.filter((row) => row.endedAt === null);
    expect(open).toHaveLength(1);
    expect(open[0]!.entryId).toBe(ranked[0]!.id);
  });

  it("counts a payment once when Stripe delivers the same event five times at once", { timeout: 60_000 }, async () => {
    const board = await newBoard();
    const owner = await pendingClaim(board.id, claim("Retry Target", 10, 100));
    await fulfillCheckout(db, paid(owner.sessionId), at(0));
    const sessions = [];
    for (let i = 0; i < 12; i++) sessions.push(await pendingBoost(owner.entryId, 5));

    // Every boost's webhook arrives five times together (Stripe retries), 60 calls in all.
    const calls = sessions.flatMap((sessionId, i) => Array.from({ length: 5 }, () => fulfillCheckout(db, paid(sessionId), at(1 + i))));
    const results = await Promise.all(calls);

    expect(count(results, "fulfilled")).toBe(12);
    expect(count(results, "already")).toBe(48);
    const [entry] = await db.select({ totalCents: entries.totalCents }).from(entries).where(eq(entries.id, owner.entryId));
    expect(entry!.totalCents).toBe((10 + 12 * 5) * 100);
  });

  it("puts 30 people claiming the same date at once on the board, each with their own link", { timeout: 60_000 }, async () => {
    const board = await newBoard();
    // All called Sam Rivera, 10 of them bidding the same $25: slugs and ties are the hard part.
    const claims = [];
    for (let i = 0; i < 30; i++) claims.push(await pendingClaim(board.id, claim("Sam Rivera", i < 10 ? 25 : 30 + i, i)));

    const results = await Promise.all(claims.map((c, i) => fulfillCheckout(db, paid(c.sessionId), at(i))));
    expect(count(results, "fulfilled")).toBe(30);

    const live = await db
      .select({ id: entries.id, slug: entries.slug, status: entries.status, totalCents: entries.totalCents })
      .from(entries)
      .where(eq(entries.boardId, board.id));
    expect(live.every((e) => e.status === "live")).toBe(true);
    expect(new Set(live.map((e) => e.slug)).size).toBe(30);
    expect(live.every((e) => /^sam-rivera(-\d+)?$/.test(e.slug ?? ""))).toBe(true);

    const ranked = await getRankedEntries(db, board.id);
    expect(ranked.map((e) => e.rank)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    // Among the ten $25 bids, whoever got there first is ahead (07 B2).
    const tied = ranked.filter((e) => e.totalCents === 2_500).map((e) => e.id);
    expect(tied).toEqual(claims.slice(0, 10).map((c) => c.entryId));

    const open = (await db.select().from(leaderLog).where(eq(leaderLog.boardId, board.id))).filter((row) => row.endedAt === null);
    expect(open).toHaveLength(1);
    expect(open[0]!.entryId).toBe(ranked[0]!.id);
    // Every claimer was added to the reminder list once.
    const reminded = await db.select({ id: reminders.id }).from(reminders).where(like(reminders.email, `%@${EMAIL_DOMAIN}`));
    expect(reminded.length).toBeGreaterThanOrEqual(30);
  });
});
