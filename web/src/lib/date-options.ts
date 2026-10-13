import { DAYS_IN_MONTH, isValidMonthDay, MONTHS, type MonthDay } from "./birthday";

/** Month and Day dropdowns (the homepage's "Find your birthday" card). Values are the numbers as text. */
export const MONTH_OPTIONS = MONTHS.map((label, i) => ({ value: String(i + 1), label }));

/** The days a month offers. No month yet: 31. February always has 29 (birthdays have no year). */
export function dayOptions(month: string): Array<{ value: string; label: string }> {
  const count = month ? DAYS_IN_MONTH[Number(month) - 1]! : 31;
  return Array.from({ length: count }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
}

/** The day to keep after the month changes: dropped when the new month doesn't have it (31 → April). */
export function dayAfterMonthChange(day: string, month: string): string {
  return day && Number(day) > DAYS_IN_MONTH[Number(month) - 1]! ? "" : day;
}

/** The date two dropdowns add up to, or null while either is empty (or they don't make a real date). */
export function pickedMonthDay(month: string, day: string): MonthDay | null {
  if (!month || !day) return null;
  const md = { month: Number(month), day: Number(day) };
  return isValidMonthDay(md) ? md : null;
}
