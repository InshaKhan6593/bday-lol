"use server";

import { db } from "@/db";
import { saveReminder, type ReminderState } from "../reminders";

/** Homepage "Remind me": one email a year, a week before the birthday. */
export async function subscribeReminder(_prev: ReminderState, form: FormData): Promise<ReminderState> {
  return saveReminder(db, { month: form.get("month"), day: form.get("day"), email: form.get("email") });
}
