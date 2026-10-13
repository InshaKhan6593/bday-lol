import type { Executor } from "@/db";
import { reminders } from "@/db/schema";
import { formatLong } from "@/lib/birthday";
import { parseReminderInput } from "@/lib/reminders";
import { resubscribeReminders } from "./email/suppressions";

export type ReminderState = { status: "idle" | "ok" | "error"; message?: string };

/**
 * Saves a yearly reminder for someone who asked for one. Signing up again re-subscribes someone who unsubscribed.
 * The homepage form that called this was removed on 2026-10-13 (the client's call): people who claim a date are
 * added by the payment instead (server/payments.ts). Kept for the people already signed up and for a later form.
 */
export async function saveReminder(
  exec: Executor,
  raw: Parameters<typeof parseReminderInput>[0],
): Promise<ReminderState> {
  const input = parseReminderInput(raw);
  if (!input.ok) return { status: "error", message: input.message };

  await exec
    .insert(reminders)
    .values({ email: input.email, month: input.md.month, day: input.md.day, source: "signup" })
    .onConflictDoUpdate({
      target: [reminders.email, reminders.month, reminders.day],
      set: { unsubscribedAt: null },
    });
  await resubscribeReminders(exec, input.email);

  return { status: "ok", message: `You're set. We'll email you a week before ${formatLong(input.md)}.` };
}
