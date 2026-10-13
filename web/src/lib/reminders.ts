import { isValidMonthDay, type MonthDay } from "./birthday";
import { isEmailAddress } from "./email-address";


export type ReminderInput = { ok: true; md: MonthDay; email: string } | { ok: false; message: string };

/** Validates a reminder signup (month, day, email). Emails are stored lowercased. */
export function parseReminderInput(raw: { month: unknown; day: unknown; email: unknown }): ReminderInput {
  const md = { month: Number(raw.month), day: Number(raw.day) };
  const email = String(raw.email ?? "").trim().toLowerCase();
  if (!isValidMonthDay(md)) return { ok: false, message: "Pick your birthday month and day." };
  if (!isEmailAddress(email)) return { ok: false, message: "Enter a valid email." };
  return { ok: true, md, email };
}
