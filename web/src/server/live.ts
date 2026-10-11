import { and, count, eq, max, sum } from "drizzle-orm";
import type { BoardTypeSettings } from "@/config/board-types";
import type { Executor } from "@/db";
import { boards, entries } from "@/db/schema";
import { currentBoardYear, toKey, type MonthDay } from "@/lib/birthday";
import { LIVE_EVENT, boardVersion, liveTopic } from "@/lib/live";

/**
 * The version of a date's open board (lib/live.ts), from one small query. An open page asks for
 * this to learn whether its board changed; the pages themselves work it out from the board they
 * already read, and the two always agree.
 */
export async function getBoardVersion(
  db: Executor,
  typeId: number,
  settings: BoardTypeSettings,
  md: MonthDay,
  instant: Date,
): Promise<string> {
  const year = currentBoardYear(md, instant, settings.timezone);
  const [row] = await db
    .select({
      boardId: boards.id,
      people: count(entries.id),
      totalCents: sum(entries.totalCents),
      lastChangedAt: max(entries.updatedAt),
    })
    .from(boards)
    .leftJoin(entries, and(eq(entries.boardId, boards.id), eq(entries.status, "live")))
    .where(and(eq(boards.boardTypeId, typeId), eq(boards.key, toKey(md)), eq(boards.period, String(year))))
    .groupBy(boards.id);
  return boardVersion({
    boardId: row?.boardId ?? null,
    people: row?.people ?? 0,
    totalCents: Number(row?.totalCents ?? 0),
    lastChangedAt: row?.lastChangedAt ?? null,
  });
}

export type Announced = { sent: true } | { sent: false; reason: string };

/**
 * Tells every open page of a date's board to look again, through Supabase Realtime's broadcast
 * API. Sent with the service-role key (server only) on a private channel: visitors can listen,
 * only the server can send (the policy is created by `pnpm db:init`).
 *
 * Never throws and never waits long: a board that can't be announced is still correct, and its
 * open pages catch up on their own timer. Does nothing without the Supabase keys (local development).
 */
export async function announceBoardChange(boardKey: string, send: typeof fetch = fetch): Promise<Announced> {
  const base = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return { sent: false, reason: "no Supabase keys" };
  try {
    const topic = encodeURIComponent(liveTopic(boardKey));
    const res = await send(`${base}/realtime/v1/api/broadcast/${topic}/events/${LIVE_EVENT}?private=true`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(3_000),
    });
    if (res.ok) return { sent: true };
    const reason = `Realtime answered ${res.status}`;
    console.warn(`[live] board ${boardKey} not announced: ${reason}`);
    return { sent: false, reason };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`[live] board ${boardKey} not announced: ${reason}`);
    return { sent: false, reason };
  }
}
