import { and, eq, isNotNull, isNull, max } from "drizzle-orm";
import type { Executor } from "@/db";
import { alertSubscriptions, entries, outbidAlerts } from "@/db/schema";

/** "Send each person at most one outbid alert per 15 minutes" (spec §8). */
export const OUTBID_ALERT_GAP_MS = 15 * 60 * 1000;

/**
 * Someone just lost #1: queue an "[Name] just got passed" email for the
 * entry's owner and everyone on its alert list. The sender (email step) runs
 * when due_at passes, works out the latest amount needed at that moment, and
 * skips it if the entry is back at #1.
 *
 * One waiting alert per (entry, email): if one is already queued, it stays
 * (it will show the newest amount anyway). A new alert waits until 15 min
 * after the last one that email received.
 */
export async function queueOutbidAlerts(db: Executor, passedEntryId: string, instant: Date): Promise<string[]> {
  const [owner] = await db
    .select({ email: entries.ownerEmail })
    .from(entries)
    .where(eq(entries.id, passedEntryId));
  const subscribers = await db
    .select({ email: alertSubscriptions.email })
    .from(alertSubscriptions)
    .where(eq(alertSubscriptions.entryId, passedEntryId));

  const recipients = [...new Set([owner?.email, ...subscribers.map((s) => s.email)].flatMap((e) => (e ? [e.toLowerCase()] : [])))];
  const queued: string[] = [];

  for (const email of recipients) {
    const [waiting] = await db
      .select({ id: outbidAlerts.id })
      .from(outbidAlerts)
      .where(and(eq(outbidAlerts.entryId, passedEntryId), eq(outbidAlerts.email, email), isNull(outbidAlerts.sentAt)))
      .limit(1);
    if (waiting) continue;

    const [last] = await db
      .select({ at: max(outbidAlerts.sentAt) })
      .from(outbidAlerts)
      .where(and(eq(outbidAlerts.email, email), isNotNull(outbidAlerts.sentAt)));
    const earliest = last?.at ? last.at.getTime() + OUTBID_ALERT_GAP_MS : 0;
    const dueAt = new Date(Math.max(instant.getTime(), earliest));

    await db.insert(outbidAlerts).values({ entryId: passedEntryId, email, dueAt });
    queued.push(email);
  }
  return queued;
}

/** The entry is #1 again: its waiting "you got passed" alerts no longer apply. */
export async function cancelOutbidAlerts(db: Executor, entryId: string): Promise<void> {
  await db.delete(outbidAlerts).where(and(eq(outbidAlerts.entryId, entryId), isNull(outbidAlerts.sentAt)));
}

/** Adds an email to an entry's "Email me if [name] gets passed" list (once). */
export async function subscribeToAlerts(db: Executor, entryId: string, email: string): Promise<void> {
  await db
    .insert(alertSubscriptions)
    .values({ entryId, email: email.toLowerCase() })
    .onConflictDoNothing({ target: [alertSubscriptions.entryId, alertSubscriptions.email] });
}
