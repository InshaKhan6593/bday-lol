import { sql } from "drizzle-orm";
import { assertLocalDatabase } from "../../scripts/load-env";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import type { ThemeKey } from "@/config/themes";
import { db } from "@/db";
import { boardTypes, entries, type GiftLink } from "@/db/schema";
import { publicId } from "@/lib/ids";
import type { MonthDay } from "@/lib/birthday";
import { ensureBoard } from "@/server/boards";
import { freeSlug } from "@/server/payments";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const ROLLBACK = Symbol("rollback");

/**
 * Runs a database test on an empty schema inside a transaction that is always
 * rolled back, so tests never change the local seed data.
 */
export async function inRollback(fn: (tx: Tx) => Promise<void>): Promise<void> {
  assertLocalDatabase();
  await db
    .transaction(async (tx) => {
      await tx.execute(sql`TRUNCATE board_types, boards, entries, payments, leader_log, alert_subscriptions,
        outbid_alerts, reminders, email_suppressions, email_log, famous_people, famous_hidden, site_pages RESTART IDENTITY CASCADE`);
      await fn(tx);
      throw ROLLBACK;
    })
    .catch((error: unknown) => {
      if (error !== ROLLBACK) throw error;
    });
}

export async function addBirthdayType(tx: Tx) {
  const [type] = await tx.insert(boardTypes).values(BIRTHDAY_BOARD_TYPE).returning();
  return type!;
}

type PersonInput = {
  name: string;
  usd: number;
  reachedAt: string;
  theme?: ThemeKey;
  status?: "pending" | "live" | "removed";
  gifts?: GiftLink[];
};

/** Adds people to the board for (month-day, year). */
export async function addPeople(
  tx: Tx,
  type: Awaited<ReturnType<typeof addBirthdayType>>,
  md: MonthDay,
  year: number,
  people: PersonInput[],
) {
  const board = await ensureBoard(tx, type, md, year);
  for (const p of people) {
    await tx.insert(entries).values({
      publicId: publicId(),
      boardId: board.id,
      slug: (p.status ?? "live") === "live" ? await freeSlug(tx, board.id, p.name) : null,
      name: p.name,
      theme: p.theme ?? "sky",
      giftLinks: p.gifts ?? [],
      totalCents: p.usd * 100,
      totalReachedAt: new Date(p.reachedAt),
      status: p.status ?? "live",
    });
  }
  return board;
}
