import { isValidMonthDay, type MonthDay } from "./birthday";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ReminderInput = { ok: true; md: MonthDay; email: string } | { ok: false; message: string };

/** Validates the homepage "Remind me" form. Emails are stored lowercased. */
export function parseReminderInput(raw: { month: unknown; day: unknown; email: unknown }): ReminderInput {
  const md = { month: Number(raw.month), day: Number(raw.day) };
  const email = String(raw.email ?? "").trim().toLowerCase();
  if (!isValidMonthDay(md)) return { ok: false, message: "Pick your birthday month and day." };
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, message: "Enter a valid email." };
  return { ok: true, md, email };
}
