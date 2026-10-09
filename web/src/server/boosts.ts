import { and, eq } from "drizzle-orm";
import type { Executor } from "@/db";
import { boards, entries, payments } from "@/db/schema";
import { parseKey, type MonthDay } from "@/lib/birthday";
import { getRankedEntries } from "./leaderboard";

export type BoostableEntry = { entryId: string; boardId: string; name: string; md: MonthDay };

/**
 * The entry behind a Boost box, by its public id. Boosts count only toward the
 * board they're on (spec §4), so a person on a board whose day has ended can't
 * be boosted any more.
 */
export async function getBoostableEntry(
  db: Executor,
  publicId: string,
  instant: Date,
): Promise<{ ok: true; entry: BoostableEntry } | { ok: false; reason: "missing" | "closed" }> {
  const [row] = await db
    .select({
      entryId: entries.id,
      boardId: boards.id,
      name: entries.name,
      key: boards.key,
      status: entries.status,
      closesAt: boards.closesAt,
    })
    .from(entries)
    .innerJoin(boards, eq(boards.id, entries.boardId))
    .where(eq(entries.publicId, publicId))
    .limit(1);
  const md = row ? parseKey(row.key) : null;
  if (!row || !md || row.status !== "live") return { ok: false, reason: "missing" };
  if (row.closesAt.getTime() <= instant.getTime()) return { ok: false, reason: "closed" };
  return { ok: true, entry: { entryId: row.entryId, boardId: row.boardId, name: row.name, md } };
}

export type BoostOutcome =
  | { status: "missing" }
  | { status: "expired" }
  | { status: "pending" }
  | { status: "done"; name: string; amountCents: number; rank: number; totalCents: number };

/** What happened to a boost checkout, for the note shown when Stripe sends the booster back. */
export async function getBoostOutcome(db: Executor, sessionId: string): Promise<BoostOutcome> {
  const [row] = await db
    .select({ status: payments.status, amountCents: payments.amountCents, entryId: entries.id, boardId: entries.boardId })
    .from(payments)
    .innerJoin(entries, eq(entries.id, payments.entryId))
    .where(and(eq(payments.stripeSessionId, sessionId), eq(payments.kind, "boost")))
    .limit(1);
  if (!row || row.status === "refunded") return { status: "missing" };
  if (row.status === "expired") return { status: "expired" };
  if (row.status === "pending") return { status: "pending" };

  const mine = (await getRankedEntries(db, row.boardId)).find((e) => e.id === row.entryId);
  if (!mine) return { status: "missing" };
  return { status: "done", name: mine.name, amountCents: row.amountCents, rank: mine.rank, totalCents: mine.totalCents };
}
