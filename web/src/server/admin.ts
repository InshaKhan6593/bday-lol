import { and, asc, desc, eq, gt, ilike, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import type { BoardTypeSettings } from "@/config/board-types";
import type { Executor } from "@/db";
import { boards, entries, famousHidden, famousPeople, leaderLog, payments, type GiftLink } from "@/db/schema";
import { toKey, type MonthDay } from "@/lib/birthday";
import type { ValidListing } from "@/lib/claim";
import { publicId } from "@/lib/ids";
import type { ThemeKey } from "@/config/themes";
import { ensureCurrentBoard } from "./boards";
import { cancelOutbidAlerts, queueOutbidAlerts } from "./outbid";
import { currentTopEntryId, freeSlug, moveLeader } from "./payments";

/**
 * What the admin does to the boards (spec §10): edit or take down a listing, put it back, and add
 * comped listings without Stripe. Every change that can move a rank runs in one transaction that
 * locks the board, like a payment does, and keeps the #1 history in step.
 *
 * These functions only change the database. The actions that call them (server/actions/admin.ts)
 * then throw away the saved pages and tell open pages to look again.
 */

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export type AdminEntry = {
  id: string;
  publicId: string;
  slug: string | null;
  /** The board's date ("10-07") and year. */
  boardKey: string;
  year: number;
  /** Rank among the live people on its board. Null for a removed listing. */
  rank: number | null;
  name: string;
  bio: string;
  photoUrl: string | null;
  theme: ThemeKey;
  giftLinks: GiftLink[];
  isMinor: boolean;
  isComped: boolean;
  status: "live" | "removed";
  totalCents: number;
  ownerEmail: string | null;
  liveAt: string | null;
};

export type AdminEntryFilter = {
  /** One date ("10-07"). Every date when left out. */
  key?: string;
  /** Part of a name. */
  q?: string;
  status?: "live" | "removed" | "all";
  /** Which page of ADMIN_PAGE_SIZE listings, from 1. */
  page?: number;
};

/** Listings per page in the admin. */
export const ADMIN_PAGE_SIZE = 50;

/** The rows a filter matches: boards open now, never unpaid claims. */
function entriesWhere(filter: AdminEntryFilter, instant: Date) {
  const q = filter.q?.trim();
  return and(
    lte(boards.opensAt, instant),
    gt(boards.closesAt, instant),
    filter.status && filter.status !== "all" ? eq(entries.status, filter.status) : ne(entries.status, "pending"),
    filter.key ? eq(boards.key, filter.key) : undefined,
    q ? ilike(entries.name, `%${q.replace(/[%_\\]/g, "\\$&")}%`) : undefined,
  );
}

/** How many listings a filter matches, for the page count. */
export async function countAdminEntries(db: Executor, filter: AdminEntryFilter, instant: Date): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(entries)
    .innerJoin(boards, eq(boards.id, entries.boardId))
    .where(entriesWhere(filter, instant));
  return row?.n ?? 0;
}

/** The last page a filter has (at least 1), so a page number from the address can be kept in range. */
export function lastAdminPage(total: number): number {
  return Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
}

/**
 * One page of the listings on the boards that are open now: newest first, or in board order when one
 * date is picked. Unpaid claims never appear (they aren't on a board).
 */
export async function listAdminEntries(db: Executor, filter: AdminEntryFilter, instant: Date): Promise<AdminEntry[]> {
  const ranked = db
    .select({
      id: entries.id,
      rank: sql<number>`(row_number() over (partition by ${entries.boardId} order by ${entries.totalCents} desc, ${entries.totalReachedAt} asc, ${entries.id} asc))::int`.as(
        "rank",
      ),
    })
    .from(entries)
    .where(eq(entries.status, "live"))
    .as("ranked");
  const page = Math.max(1, Math.floor(filter.page ?? 1));
  const rows = await db
    .select({
      id: entries.id,
      publicId: entries.publicId,
      slug: entries.slug,
      boardKey: boards.key,
      period: boards.period,
      rank: ranked.rank,
      name: entries.name,
      bio: entries.bio,
      photoUrl: entries.photoUrl,
      theme: entries.theme,
      giftLinks: entries.giftLinks,
      isMinor: entries.isMinor,
      isComped: entries.isComped,
      status: entries.status,
      totalCents: entries.totalCents,
      ownerEmail: entries.ownerEmail,
      liveAt: entries.liveAt,
    })
    .from(entries)
    .innerJoin(boards, eq(boards.id, entries.boardId))
    .leftJoin(ranked, eq(ranked.id, entries.id))
    .where(entriesWhere(filter, instant))
    // The id settles ties, so a listing is never on two pages or on none.
    .orderBy(
      ...(filter.key ? [asc(entries.status), desc(entries.totalCents), asc(entries.totalReachedAt)] : [desc(entries.liveAt)]),
      asc(entries.id),
    )
    .limit(ADMIN_PAGE_SIZE)
    .offset((page - 1) * ADMIN_PAGE_SIZE);
  return rows.map(({ period, liveAt, status, ...row }) => ({
    ...row,
    status: status as "live" | "removed",
    year: Number(period),
    liveAt: liveAt?.toISOString() ?? null,
  }));
}

export type BoardChange = { boardKey: string; boardId: string };
export type AdminResult = { ok: true; change: BoardChange } | { ok: false; error: string };

/** Locks an entry's board, then runs `fn` with both. The lock is what keeps ranks and the #1 history straight. */
async function onLockedBoard<T>(
  db: Executor,
  entryId: string,
  fn: (tx: Executor, entry: typeof entries.$inferSelect, board: { id: string; key: string; closesAt: Date }) => Promise<T>,
): Promise<T | null> {
  return db.transaction(async (tx) => {
    const [found] = await tx.select({ boardId: entries.boardId }).from(entries).where(eq(entries.id, entryId)).limit(1);
    if (!found) return null;
    const [board] = await tx
      .select({ id: boards.id, key: boards.key, closesAt: boards.closesAt })
      .from(boards)
      .where(eq(boards.id, found.boardId))
      .for("update");
    const [entry] = await tx.select().from(entries).where(eq(entries.id, entryId)).for("update");
    if (!board || !entry) return null;
    return fn(tx, entry, board);
  });
}

/**
 * After a change that may have moved #1: opens the new leader's stint, or closes the last one when
 * nobody is left. Someone pushed out of #1 by a listing that was added or put back gets the same
 * outbid alert a payment would send (never for a day that has ended, and never for a listing that
 * was itself taken down).
 */
async function settleLeader(
  tx: Executor,
  board: { id: string; closesAt: Date },
  previousTopEntryId: string | null,
  instant: Date,
): Promise<void> {
  const top = await currentTopEntryId(tx, board.id);
  if (top === previousTopEntryId) return;
  if (!top) {
    await tx.update(leaderLog).set({ endedAt: instant }).where(and(eq(leaderLog.boardId, board.id), isNull(leaderLog.endedAt)));
    return;
  }
  await moveLeader(tx, board.id, top, instant);
  await cancelOutbidAlerts(tx, top);
  if (!previousTopEntryId || board.closesAt.getTime() <= instant.getTime()) return;
  const [previous] = await tx.select({ status: entries.status }).from(entries).where(eq(entries.id, previousTopEntryId));
  if (previous?.status === "live") await queueOutbidAlerts(tx, previousTopEntryId, instant);
}

/** Takes a listing down ("removed") or puts it back ("live"). The rest of the board moves up or down. */
export async function setEntryStatus(db: Executor, entryId: string, status: "live" | "removed", instant: Date): Promise<AdminResult> {
  const done = await onLockedBoard(db, entryId, async (tx, entry, board) => {
    if (entry.status === "pending") return { ok: false as const, error: "That claim hasn’t been paid for yet." };
    if (entry.status === status) return { ok: true as const, change: { boardKey: board.key, boardId: board.id } };
    const previousTop = await currentTopEntryId(tx, board.id);
    await tx.update(entries).set({ status }).where(eq(entries.id, entryId));
    if (status === "removed") await cancelOutbidAlerts(tx, entryId);
    await settleLeader(tx, board, previousTop, instant);
    return { ok: true as const, change: { boardKey: board.key, boardId: board.id } };
  });
  return done ?? { ok: false, error: "That listing no longer exists." };
}

export type ListingEdit = ValidListing & {
  /** A new photo's URL, null to remove the photo, undefined to keep the current one. */
  photoUrl?: string | null;
};

/**
 * Saves an edited listing. The personal link keeps its name (/october-7/sam-rivera) even when the
 * name changes, so links people already shared keep working.
 */
export async function updateListing(db: Executor, entryId: string, edit: ListingEdit): Promise<AdminResult> {
  const done = await onLockedBoard(db, entryId, async (tx, entry, board) => {
    if (entry.status === "pending") return { ok: false as const, error: "That claim hasn’t been paid for yet." };
    await tx
      .update(entries)
      .set({
        name: edit.name,
        bio: edit.bio,
        theme: edit.theme,
        giftLinks: edit.giftLinks,
        isMinor: edit.isMinor,
        ...(edit.photoUrl !== undefined ? { photoUrl: edit.photoUrl } : {}),
      })
      .where(eq(entries.id, entryId));
    return { ok: true as const, change: { boardKey: board.key, boardId: board.id } };
  });
  return done ?? { ok: false, error: "That listing no longer exists." };
}

// ---------------------------------------------------------------------------
// Comped listings (free featured spots: no Stripe, never counted as revenue)
// ---------------------------------------------------------------------------

export type CompedInput = {
  md: MonthDay;
  listing: ValidListing;
  /** The bid the admin sets. It ranks exactly like a paid total. */
  amountCents: number;
  photoUrl: string | null;
};

/** A comped amount: whole dollars, at least $1, and not beyond what the total column can hold. */
export function compedAmountError(amountCents: number): string | null {
  if (!Number.isInteger(amountCents) || amountCents < 100 || amountCents % 100 !== 0) return "Enter a whole dollar amount.";
  if (amountCents > 100_000_000) return "That amount is too large.";
  return null;
}

/** Adds a comped listing to the date's open board. It goes live at once and looks like any other. */
export async function addCompedEntry(
  db: Executor,
  type: { id: number; settings: BoardTypeSettings },
  input: CompedInput,
  instant: Date,
): Promise<AdminResult & { entryId?: string }> {
  const amountError = compedAmountError(input.amountCents);
  if (amountError) return { ok: false, error: amountError };
  return db.transaction(async (tx) => {
    const ensured = await ensureCurrentBoard(tx, type, input.md, instant);
    const [board] = await tx
      .select({ id: boards.id, key: boards.key, closesAt: boards.closesAt })
      .from(boards)
      .where(eq(boards.id, ensured.id))
      .for("update");
    const previousTop = await currentTopEntryId(tx, board!.id);
    const slug = await freeSlug(tx, board!.id, input.listing.name);
    const [entry] = await tx
      .insert(entries)
      .values({
        publicId: publicId(),
        slug,
        boardId: board!.id,
        ...input.listing,
        photoUrl: input.photoUrl,
        totalCents: input.amountCents,
        totalReachedAt: instant,
        status: "live",
        isComped: true,
        liveAt: instant,
      })
      .returning({ id: entries.id });
    await tx.insert(payments).values({ entryId: entry!.id, kind: "comp", status: "paid", amountCents: input.amountCents, paidAt: instant });
    await settleLeader(tx, board!, previousTop, instant);
    return { ok: true as const, change: { boardKey: board!.key, boardId: board!.id }, entryId: entry!.id };
  });
}

/** Changes a comped listing's amount (paid totals are never edited: they are what people paid). */
export async function setCompedAmount(db: Executor, entryId: string, amountCents: number, instant: Date): Promise<AdminResult> {
  const amountError = compedAmountError(amountCents);
  if (amountError) return { ok: false, error: amountError };
  const done = await onLockedBoard(db, entryId, async (tx, entry, board) => {
    if (!entry.isComped) return { ok: false as const, error: "Only a comped listing’s amount can be changed." };
    // Boosts people paid on top of the comp stay: only the comped part changes.
    const [comp] = await tx
      .select({ id: payments.id, amountCents: payments.amountCents })
      .from(payments)
      .where(and(eq(payments.entryId, entryId), eq(payments.kind, "comp")))
      .limit(1);
    if (!comp) return { ok: false as const, error: "That listing has no comped amount." };
    if (comp.amountCents === amountCents) return { ok: true as const, change: { boardKey: board.key, boardId: board.id } };
    const previousTop = await currentTopEntryId(tx, board.id);
    await tx.update(payments).set({ amountCents }).where(eq(payments.id, comp.id));
    await tx
      .update(entries)
      .set({ totalCents: entry.totalCents - comp.amountCents + amountCents, totalReachedAt: instant })
      .where(eq(entries.id, entryId));
    if (entry.status === "live") await settleLeader(tx, board, previousTop, instant);
    return { ok: true as const, change: { boardKey: board.key, boardId: board.id } };
  });
  return done ?? { ok: false, error: "That listing no longer exists." };
}

/** The comped part of each listing's total, for the edit form. */
export async function getCompedAmounts(db: Executor, entryIds: string[]): Promise<Record<string, number>> {
  if (!entryIds.length) return {};
  const rows = await db
    .select({ entryId: payments.entryId, amountCents: payments.amountCents })
    .from(payments)
    .where(and(eq(payments.kind, "comp"), inArray(payments.entryId, entryIds)));
  return Object.fromEntries(rows.map((r) => [r.entryId, r.amountCents]));
}

// ---------------------------------------------------------------------------
// Famous people ("Hide this person", spec §10)
// ---------------------------------------------------------------------------

export type AdminFamous = {
  source: string;
  sourceId: string;
  name: string;
  knownFor: string;
  birthDate: string;
  rank: number;
  hidden: boolean;
};

/** Everyone stored for a date, hidden people included, best known first. The site shows the first 10 not hidden. */
export async function listAdminFamous(db: Executor, md: MonthDay): Promise<AdminFamous[]> {
  const rows = await db
    .select({
      source: famousPeople.source,
      sourceId: famousPeople.sourceId,
      name: famousPeople.name,
      knownFor: famousPeople.knownFor,
      birthDate: famousPeople.birthDate,
      rank: famousPeople.rank,
      hiddenId: famousHidden.sourceId,
    })
    .from(famousPeople)
    .leftJoin(famousHidden, and(eq(famousHidden.source, famousPeople.source), eq(famousHidden.sourceId, famousPeople.sourceId)))
    .where(eq(famousPeople.key, toKey(md)))
    .orderBy(asc(famousPeople.rank));
  return rows.map(({ hiddenId, ...row }) => ({ ...row, hidden: hiddenId !== null }));
}

/** Hides a famous person everywhere (the next name moves up), or shows them again. Survives the monthly refresh. */
export async function setFamousHidden(
  db: Executor,
  person: { source: string; sourceId: string },
  hidden: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hidden) {
    await db.delete(famousHidden).where(and(eq(famousHidden.source, person.source), eq(famousHidden.sourceId, person.sourceId)));
    return { ok: true };
  }
  const [known] = await db
    .select({ name: famousPeople.name })
    .from(famousPeople)
    .where(and(eq(famousPeople.source, person.source), eq(famousPeople.sourceId, person.sourceId)))
    .limit(1);
  if (!known) return { ok: false, error: "That person isn’t on the list any more." };
  await db.insert(famousHidden).values({ ...person, name: known.name }).onConflictDoNothing();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Revenue (07 B15: a simple table; Stripe stays the real source)
// ---------------------------------------------------------------------------

export type RevenueRow = {
  /** "2026-10-07" for a day, "2026-10" for a month (Eastern Time). */
  period: string;
  claimsCents: number;
  claims: number;
  boostsCents: number;
  boosts: number;
  /** Comped listings: shown, never added to the totals. */
  compedCents: number;
  comped: number;
};

export type Revenue = { days: RevenueRow[]; months: RevenueRow[]; allTime: RevenueRow };

const emptyRow = (period: string): RevenueRow => ({ period, claimsCents: 0, claims: 0, boostsCents: 0, boosts: 0, compedCents: 0, comped: 0 });

/** Money a row really brought in: claims plus boosts. Comped never counts. */
export function paidCents(row: RevenueRow): number {
  return row.claimsCents + row.boostsCents;
}

async function revenueBy(db: Executor, format: string, timeZone: string, since: Date | null): Promise<RevenueRow[]> {
  const period = sql<string>`to_char(${payments.paidAt} at time zone ${timeZone}, ${format})`;
  const rows = await db
    .select({
      period,
      kind: payments.kind,
      cents: sql<number>`sum(${payments.amountCents})::int`,
      n: sql<number>`count(*)::int`,
    })
    .from(payments)
    .where(and(eq(payments.status, "paid"), since ? gt(payments.paidAt, since) : undefined))
    // By position: the period is built from parameters, so repeating it would not match itself.
    .groupBy(sql`1`, payments.kind)
    .orderBy(sql`1 desc`);
  const out = new Map<string, RevenueRow>();
  for (const r of rows) {
    const row = out.get(r.period) ?? emptyRow(r.period);
    if (r.kind === "claim") Object.assign(row, { claimsCents: r.cents, claims: r.n });
    else if (r.kind === "boost") Object.assign(row, { boostsCents: r.cents, boosts: r.n });
    else Object.assign(row, { compedCents: r.cents, comped: r.n });
    out.set(r.period, row);
  }
  return [...out.values()];
}

/** Paid claims and boosts by day (the last 30 days) and by month, in Eastern Time, with comped listings apart. */
export async function getRevenue(db: Executor, instant: Date, timeZone: string): Promise<Revenue> {
  const days = await revenueBy(db, "YYYY-MM-DD", timeZone, new Date(instant.getTime() - 30 * 86_400_000));
  const months = await revenueBy(db, "YYYY-MM", timeZone, null);
  const allTime = months.reduce((sum, m) => {
    for (const k of ["claimsCents", "claims", "boostsCents", "boosts", "compedCents", "comped"] as const) sum[k] += m[k];
    return sum;
  }, emptyRow("all"));
  return { days, months, allTime };
}
