import { and, asc, eq, inArray, isNull, like, lt, lte, max, or } from "drizzle-orm";
import type { Executor } from "@/db";
import { boards, emailLog, entries, outbidAlerts, payments, reminders } from "@/db/schema";
import { hourIn, nextDates, toKey, zonedDate } from "@/lib/birthday";
import { takeTopBoost } from "@/lib/boost";
import { boostDigestEmail, outbidAlertEmail, reminderEmail, yourDayEmail } from "@/lib/email-templates";
import { minToTakeTop } from "@/lib/money";
import { absoluteUrl, routes } from "@/lib/routes";
import { getBirthdaySettings, getCurrentBoard, getRankedEntries } from "../leaderboard";
import { OUTBID_ALERT_GAP_MS } from "../outbid";
import { loadEntryContext } from "./context";
import type { Mailer } from "./mailer";
import { addRuns, emptyRun, sendCounted, type EmailRun } from "./send";

/**
 * Emails that go out on a timer. /api/cron/emails runs runEmailTick every
 * minute (vercel.json); locally run `pnpm emails:tick`. Every sender is safe to
 * run again: dedupe keys and sent markers stop repeats, and a failed send is
 * simply picked up by the next tick.
 */

/** "Your day is here" and reminders go out from 8:00 AM ET (07 B16). */
export const MORNING_HOUR = 8;
/** "You got boosted" is bundled: at most one digest per person per hour (spec §8). */
export const DIGEST_GAP_MS = 60 * 60 * 1000;
/** Reminders go out this many days before the date (spec §8). */
export const REMINDER_DAYS_BEFORE = 7;

const BATCH = 200;

export async function runEmailTick(db: Executor, mailer: Mailer, instant: Date): Promise<EmailRun> {
  const runs: EmailRun[] = [];
  for (const step of [sendDueOutbidAlerts, sendBoostDigests, sendYourDayEmails, sendReminders]) {
    try {
      runs.push(await step(db, mailer, instant));
    } catch (error) {
      runs.push({ ...emptyRun(), failed: 1, errors: [`${step.name}: ${error instanceof Error ? error.message : String(error)}`] });
    }
  }
  return addRuns(...runs);
}

// ---------------------------------------------------------------------------
// 3. Outbid alerts (queued by server/outbid.ts when someone loses #1)
// ---------------------------------------------------------------------------

/**
 * Sends the alerts whose time has come. Checked again at send time: an entry
 * that is #1 again, was taken down, or whose day has ended gets no alert, and
 * the amount shown is what it takes to win #1 back right now.
 */
export async function sendDueOutbidAlerts(db: Executor, mailer: Mailer, instant: Date): Promise<EmailRun> {
  const run = emptyRun();
  const due = await db
    .select({ id: outbidAlerts.id, entryId: outbidAlerts.entryId, email: outbidAlerts.email })
    .from(outbidAlerts)
    .where(and(isNull(outbidAlerts.sentAt), lte(outbidAlerts.dueAt, instant)))
    .orderBy(asc(outbidAlerts.dueAt))
    .limit(BATCH);

  for (const alert of due) {
    const ctx = await loadEntryContext(db, alert.entryId, instant);
    const top = ctx?.ranked[0];
    if (!ctx?.mine || !top || ctx.mine.rank === 1 || ctx.closesAt.getTime() <= instant.getTime()) {
      await db.delete(outbidAlerts).where(eq(outbidAlerts.id, alert.id));
      run.skipped += 1;
      continue;
    }

    // Max one alert per person per 15 min, across everyone they follow.
    const [last] = await db
      .select({ at: max(outbidAlerts.sentAt) })
      .from(outbidAlerts)
      .where(eq(outbidAlerts.email, alert.email));
    if (last?.at && last.at.getTime() + OUTBID_ALERT_GAP_MS > instant.getTime()) {
      await db
        .update(outbidAlerts)
        .set({ dueAt: new Date(last.at.getTime() + OUTBID_ALERT_GAP_MS) })
        .where(eq(outbidAlerts.id, alert.id));
      run.skipped += 1;
      continue;
    }

    const { entry, md, mine } = ctx;
    const amountCents = takeTopBoost(top.totalCents, mine.totalCents, ctx.settings.minBoostCents);
    const result = await sendCounted(
      db,
      mailer,
      {
        type: "outbid_alert",
        to: alert.email,
        at: instant,
        dedupeKey: `outbid:${alert.id}`,
        meta: { entryId: entry.id, amountCents },
        content: outbidAlertEmail({
          name: entry.name,
          bio: entry.bio,
          photoUrl: entry.photoUrl,
          theme: entry.theme,
          md,
          isOwner: alert.email === entry.ownerEmail?.toLowerCase(),
          newTop: { name: top.name, totalCents: top.totalCents },
          amountCents,
          totalCents: mine.totalCents,
          rank: mine.rank,
          isToday: ctx.isToday,
          boostUrl: absoluteUrl(routes.boostLink(md, entry.publicId, amountCents)),
        }),
      },
      run,
    );
    if (result !== "failed") await db.update(outbidAlerts).set({ sentAt: instant }).where(eq(outbidAlerts.id, alert.id));
  }
  return run;
}

// ---------------------------------------------------------------------------
// 6. "You got boosted" digest
// ---------------------------------------------------------------------------

/**
 * Bundles new boosts per person: the first one goes out on the next tick, then
 * at most one digest an hour. Boosts people paid on their own entry are left
 * out (they already got a receipt), and who boosted is never shown.
 */
export async function sendBoostDigests(db: Executor, mailer: Mailer, instant: Date): Promise<EmailRun> {
  const run = emptyRun();
  const waiting = await db
    .select({ id: payments.id, entryId: payments.entryId, amountCents: payments.amountCents, email: payments.email, paidAt: payments.paidAt })
    .from(payments)
    .where(and(eq(payments.kind, "boost"), eq(payments.status, "paid"), isNull(payments.digestSentAt)))
    .orderBy(asc(payments.paidAt))
    .limit(BATCH * 5);

  const byEntry = new Map<string, typeof waiting>();
  for (const p of waiting) byEntry.set(p.entryId, [...(byEntry.get(p.entryId) ?? []), p]);

  for (const [entryId, boosts] of byEntry) {
    const ctx = await loadEntryContext(db, entryId, instant);
    const owner = ctx?.entry.ownerEmail?.toLowerCase() ?? null;
    const fromOthers = boosts.filter((b) => b.email?.toLowerCase() !== owner);
    const markDone = () =>
      db.update(payments).set({ digestSentAt: instant }).where(inArray(payments.id, boosts.map((b) => b.id)));

    if (!ctx?.mine || !owner || fromOthers.length === 0) {
      await markDone();
      continue;
    }

    const [last] = await db
      .select({ at: max(emailLog.sentAt) })
      .from(emailLog)
      .where(and(eq(emailLog.type, "boost_digest"), like(emailLog.dedupeKey, `digest:${entryId}:%`)));
    if (last?.at && last.at.getTime() + DIGEST_GAP_MS > instant.getTime()) {
      run.skipped += 1;
      continue;
    }

    const { entry, md, mine } = ctx;
    const result = await sendCounted(
      db,
      mailer,
      {
        type: "boost_digest",
        to: owner,
        category: "boost_digest",
        at: instant,
        dedupeKey: `digest:${entryId}:${fromOthers.at(-1)!.id}`,
        meta: { entryId, payments: fromOthers.map((b) => b.id) },
        content: boostDigestEmail({
          name: entry.name,
          bio: entry.bio,
          photoUrl: entry.photoUrl,
          theme: entry.theme,
          md,
          boosts: fromOthers.map((b) => ({ amountCents: b.amountCents, at: b.paidAt ?? instant })),
          totalCents: mine.totalCents,
          rank: mine.rank,
          dateUrl: ctx.personUrl,
          timeZone: ctx.settings.timezone,
        }),
      },
      run,
    );
    if (result !== "failed") await markDone();
  }
  return run;
}

// ---------------------------------------------------------------------------
// 5. "Your day is here" (8:00 AM ET on the date)
// ---------------------------------------------------------------------------

/** Everyone on today's list, from 8 AM ET. People who claim later in the day get it on the next tick. */
export async function sendYourDayEmails(db: Executor, mailer: Mailer, instant: Date): Promise<EmailRun> {
  const run = emptyRun();
  const { typeId, settings } = await getBirthdaySettings(db);
  if (hourIn(instant, settings.timezone) < MORNING_HOUR) return run;

  const today = zonedDate(instant, settings.timezone);
  const [board] = await db
    .select({ id: boards.id })
    .from(boards)
    .where(and(eq(boards.boardTypeId, typeId), eq(boards.key, toKey(today)), eq(boards.period, String(today.year))))
    .limit(1);
  if (!board) return run;

  const ranked = await getRankedEntries(db, board.id);
  const owners = await db
    .select({ id: entries.id, email: entries.ownerEmail })
    .from(entries)
    .where(and(eq(entries.boardId, board.id), eq(entries.status, "live")));
  const emailOf = new Map(owners.map((o) => [o.id, o.email]));

  const sent = new Set(
    (
      await db
        .select({ key: emailLog.dedupeKey })
        .from(emailLog)
        .where(inArray(emailLog.dedupeKey, ranked.map((e) => `your-day:${e.id}`)))
    ).map((r) => r.key),
  );

  for (const e of ranked) {
    const to = emailOf.get(e.id);
    if (!to || sent.has(`your-day:${e.id}`)) continue;
    await sendCounted(
      db,
      mailer,
      {
        type: "your_day",
        to,
        category: "your_day",
        at: instant,
        dedupeKey: `your-day:${e.id}`,
        meta: { entryId: e.id },
        content: yourDayEmail({
          name: e.name,
          bio: e.bio,
          photoUrl: e.photoUrl ? absoluteUrl(e.photoUrl) : null,
          theme: e.theme,
          md: today,
          rank: e.rank,
          totalCents: e.totalCents,
          hasGiftLinks: e.giftLinks.length > 0,
          dateUrl: absoluteUrl(routes.person(today, e.slug)),
        }),
      },
      run,
    );
  }
  return run;
}

// ---------------------------------------------------------------------------
// 4 + 7. Birthday reminder and yearly re-claim (a week before, once a year)
// ---------------------------------------------------------------------------

/**
 * Reminders for the date exactly a week from today, from 8 AM ET. Homepage
 * signups get "October 7 is in a week"; last year's claimers (source "claim")
 * get "Claim October 7 again". Anyone who is already on that date's board is
 * skipped: they don't need reminding.
 */
export async function sendReminders(db: Executor, mailer: Mailer, instant: Date): Promise<EmailRun> {
  const run = emptyRun();
  const { typeId, settings } = await getBirthdaySettings(db);
  if (hourIn(instant, settings.timezone) < MORNING_HOUR) return run;

  const target = nextDates(zonedDate(instant, settings.timezone), REMINDER_DAYS_BEFORE).at(-1)!;
  const md = { month: target.month, day: target.day };
  const year = target.year;

  const due = await db
    .select({ id: reminders.id, email: reminders.email, source: reminders.source })
    .from(reminders)
    .where(
      and(
        eq(reminders.month, md.month),
        eq(reminders.day, md.day),
        isNull(reminders.unsubscribedAt),
        or(isNull(reminders.lastSentYear), lt(reminders.lastSentYear, year)),
      ),
    )
    .limit(BATCH);
  if (due.length === 0) return run;

  const board = await getCurrentBoard(db, typeId, settings, md, instant);
  const topTotalCents = board.entries[0]?.totalCents ?? null;
  const onBoard = new Set(
    board.boardId
      ? (
          await db
            .select({ email: entries.ownerEmail })
            .from(entries)
            .where(and(eq(entries.boardId, board.boardId), eq(entries.status, "live")))
        ).flatMap((r) => (r.email ? [r.email.toLowerCase()] : []))
      : [],
  );
  const markSent = (id: string) => db.update(reminders).set({ lastSentYear: year }).where(eq(reminders.id, id));

  for (const r of due) {
    if (onBoard.has(r.email)) {
      await markSent(r.id);
      run.skipped += 1;
      continue;
    }
    const result = await sendCounted(
      db,
      mailer,
      {
        type: "reminder",
        to: r.email,
        category: "reminders",
        at: instant,
        dedupeKey: `reminder:${r.id}:${year}`,
        meta: { reminderId: r.id, year, source: r.source },
        content: reminderEmail({
          md,
          source: r.source,
          topTotalCents,
          minCents: minToTakeTop(topTotalCents, settings),
          claimUrl: absoluteUrl(routes.claim(md)),
        }),
      },
      run,
    );
    if (result !== "failed") await markSent(r.id);
  }
  return run;
}
