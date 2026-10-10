import { and, eq } from "drizzle-orm";
import type { ThemeKey } from "@/config/themes";
import type { Executor } from "@/db";
import { boards, entries, payments } from "@/db/schema";
import { parseKey, toKey, zonedDate } from "@/lib/birthday";
import { takeTopBoost } from "@/lib/boost";
import type { Placement } from "@/lib/success";
import { getBirthdaySettings, getRankedEntries } from "./leaderboard";

/** A person as the Success page shows them. Public fields only: this goes to the browser. */
export type CardPerson = {
  name: string;
  photoUrl: string | null;
  theme: ThemeKey;
  /** Personal link name: mybday.lol/october-7/sam-rivera. */
  slug: string | null;
};

export type ClaimOutcome =
  /** No claim with this Stripe session (or it was removed by the admin). */
  | { status: "missing" }
  /** Checkout ended without paying (session expired). */
  | { status: "expired" }
  /** Paid, but Stripe's webhook hasn't landed yet: "Finishing up…". */
  | { status: "pending" }
  | {
      status: "done";
      placement: Placement;
      /** The claimer: the page uses their color. */
      you: CardPerson;
      /** The date's #1, who the shared link's card shows. Same as `you` at #1. */
      top: CardPerson;
    };

/**
 * The real result of a claim checkout, read from the database (never from
 * what the form hoped for, 07 B1/B6). Stripe sends people to
 * /claim/success?session_id=cs_… and the webhook marks the payment paid and
 * the entry live.
 */
export async function getClaimOutcome(db: Executor, sessionId: string, instant: Date): Promise<ClaimOutcome> {
  const [row] = await db
    .select({
      paymentStatus: payments.status,
      entryId: entries.id,
      entryStatus: entries.status,
      boardId: boards.id,
      key: boards.key,
      period: boards.period,
      closesAt: boards.closesAt,
    })
    .from(payments)
    .innerJoin(entries, eq(entries.id, payments.entryId))
    .innerJoin(boards, eq(boards.id, entries.boardId))
    .where(and(eq(payments.stripeSessionId, sessionId), eq(payments.kind, "claim")))
    .limit(1);

  if (!row || row.entryStatus === "removed" || row.paymentStatus === "refunded") return { status: "missing" };
  if (row.paymentStatus === "expired") return { status: "expired" };
  if (row.paymentStatus === "pending" || row.entryStatus !== "live") return { status: "pending" };

  const md = parseKey(row.key);
  const ranked = await getRankedEntries(db, row.boardId);
  const mine = ranked.find((e) => e.id === row.entryId);
  const first = ranked[0];
  if (!md || !mine || !first) return { status: "missing" };

  const { settings } = await getBirthdaySettings(db);
  const today = zonedDate(instant, settings.timezone);
  const year = Number(row.period);
  const when =
    row.closesAt.getTime() <= instant.getTime()
      ? "closed"
      : row.key === toKey(today) && year === today.year
        ? "today"
        : "upcoming";
  const person = (e: typeof first): CardPerson => ({ name: e.name, photoUrl: e.photoUrl, theme: e.theme, slug: e.slug });

  return {
    status: "done",
    placement: {
      md,
      year,
      rank: mine.rank,
      when,
      currentYear: today.year,
      toTopCents: mine.rank > 1 ? takeTopBoost(first.totalCents, mine.totalCents, settings.minBoostCents) : null,
    },
    you: person(mine),
    top: person(first),
  };
}
