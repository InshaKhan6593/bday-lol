import { TZDate } from "@date-fns/tz";

/**
 * Birthday calendar rules.
 *
 * A birthday is month + day only (no year). Each of the 366 dates has one board
 * per year. A date's board closes at midnight (board time zone) at the end of
 * that date, and next year's board opens right away. Feb 29 boards exist only
 * in leap years.
 */

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Days per month with February fixed at 29, because birthdays have no year. */
export const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** month is 1-12, day is 1-31. */
export type MonthDay = { month: number; day: number };
export type CalendarDate = MonthDay & { year: number };

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function isValidMonthDay({ month, day }: MonthDay): boolean {
  return (
    Number.isInteger(month) && Number.isInteger(day) &&
    month >= 1 && month <= 12 &&
    day >= 1 && day <= DAYS_IN_MONTH[month - 1]!
  );
}

export function isLeapDay({ month, day }: MonthDay): boolean {
  return month === 2 && day === 29;
}

/** Whether this month-day happens in the given year (only Feb 29 can be missing). */
export function occursIn(md: MonthDay, year: number): boolean {
  return !isLeapDay(md) || isLeapYear(year);
}

export function compareMonthDay(a: MonthDay, b: MonthDay): number {
  return a.month - b.month || a.day - b.day;
}

/** All 366 month-days in calendar order. */
export function allMonthDays(): MonthDay[] {
  return DAYS_IN_MONTH.flatMap((len, i) =>
    Array.from({ length: len }, (_, d) => ({ month: i + 1, day: d + 1 })),
  );
}

// ---------------------------------------------------------------------------
// Keys and URL slugs
// ---------------------------------------------------------------------------

/** Board key stored in the database: "10-07". */
export function toKey({ month, day }: MonthDay): string {
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseKey(key: string): MonthDay | null {
  const match = /^(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const md = { month: Number(match[1]), day: Number(match[2]) };
  return isValidMonthDay(md) ? md : null;
}

/** Date page slug: "october-7". */
export function toSlug({ month, day }: MonthDay): string {
  return `${MONTHS[month - 1]!.toLowerCase()}-${day}`;
}

/** Month page slug: "october". */
export function monthSlug(month: number): string {
  return MONTHS[month - 1]!.toLowerCase();
}

export type ParsedSlug =
  | { kind: "date"; md: MonthDay }
  | { kind: "month"; month: number };

/** Parses "october-7" (date page) or "october" (month page). Anything else is null. */
export function parseSlug(slug: string): ParsedSlug | null {
  const match = /^([a-z]+)(?:-(\d{1,2}))?$/.exec(slug);
  if (!match) return null;
  const monthIndex = MONTHS.findIndex((m) => m.toLowerCase() === match[1]);
  if (monthIndex === -1) return null;
  const month = monthIndex + 1;
  if (match[2] === undefined) return { kind: "month", month };
  // No leading zeros: "october-07" is not a valid URL.
  if (match[2].startsWith("0")) return null;
  const md = { month, day: Number(match[2]) };
  return isValidMonthDay(md) ? { kind: "date", md } : null;
}

/**
 * Old short slug from the mockup's share links: "oct-7". These 301-redirect to
 * the real URL (decided, 07 A1).
 */
export function parseShortSlug(slug: string): MonthDay | null {
  const match = /^([a-z]{3})-([1-9]\d?)$/.exec(slug);
  if (!match) return null;
  const monthIndex = MONTHS_SHORT.findIndex((m) => m.toLowerCase() === match[1]);
  if (monthIndex === -1) return null;
  const md = { month: monthIndex + 1, day: Number(match[2]) };
  return isValidMonthDay(md) ? md : null;
}

/** "October 7" */
export function formatLong({ month, day }: MonthDay): string {
  return `${MONTHS[month - 1]} ${day}`;
}

/** "October 7" with a no-break space, so headings never split the month from the day. */
export function formatLongNb(md: MonthDay): string {
  return formatLong(md).replace(" ", " ");
}

/** "Oct 7" */
export function formatShort({ month, day }: MonthDay): string {
  return `${MONTHS_SHORT[month - 1]} ${day}`;
}

// ---------------------------------------------------------------------------
// Time zone and board periods
// ---------------------------------------------------------------------------

/** The calendar date of an instant in the given time zone. */
export function zonedDate(instant: Date, timeZone: string): CalendarDate {
  const z = new TZDate(instant.getTime(), timeZone);
  return { year: z.getFullYear(), month: z.getMonth() + 1, day: z.getDate() };
}

/**
 * Year of the board that is open right now for this month-day.
 * Today or later this year → this year. Already passed → the next year it occurs
 * (for Feb 29, the next leap year).
 */
export function currentBoardYear(md: MonthDay, instant: Date, timeZone: string): number {
  const today = zonedDate(instant, timeZone);
  let year = compareMonthDay(md, today) < 0 ? today.year + 1 : today.year;
  while (!occursIn(md, year)) year += 1;
  return year;
}

/** The year before `year` in which this month-day occurred. */
export function previousOccurrenceYear(md: MonthDay, year: number): number {
  let y = year - 1;
  while (!occursIn(md, y)) y -= 1;
  return y;
}

/** Midnight at the start of `year-month-day` in the time zone, as an instant. */
function zonedMidnight(year: number, month: number, day: number, timeZone: string): Date {
  // Date-style overflow: day 32 rolls into the next month, Dec 32 into next year.
  return new Date(new TZDate(year, month - 1, day, 0, 0, 0, timeZone).getTime());
}

/** When the board for (month-day, year) closes: midnight right after that date. */
export function boardClosesAt(md: MonthDay, year: number, timeZone: string): Date {
  return zonedMidnight(year, md.month, md.day + 1, timeZone);
}

/** When the board for (month-day, year) opens: the moment the previous one closed. */
export function boardOpensAt(md: MonthDay, year: number, timeZone: string): Date {
  return boardClosesAt(md, previousOccurrenceYear(md, year), timeZone);
}

/** Whole calendar days from today (in the time zone) to the given date. 0 = today. */
export function daysUntil(target: CalendarDate, instant: Date, timeZone: string): number {
  const today = zonedDate(instant, timeZone);
  const a = Date.UTC(today.year, today.month - 1, today.day);
  const b = Date.UTC(target.year, target.month - 1, target.day);
  return Math.round((b - a) / 86_400_000);
}

/** The next `count` real calendar dates after `from` (Feb 29 only in leap years). */
export function nextDates(from: CalendarDate, count: number): CalendarDate[] {
  const dates: CalendarDate[] = [];
  for (let offset = 1; dates.length < count; offset++) {
    const d = new Date(Date.UTC(from.year, from.month - 1, from.day + offset));
    dates.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
  }
  return dates;
}

/** Midnight at the start of the current day in the time zone. */
export function startOfDayIn(instant: Date, timeZone: string): Date {
  const today = zonedDate(instant, timeZone);
  return zonedMidnight(today.year, today.month, today.day, timeZone);
}

/** Milliseconds until the current day ends (next midnight in the time zone). */
export function msUntilDayEnds(instant: Date, timeZone: string): number {
  const today = zonedDate(instant, timeZone);
  return zonedMidnight(today.year, today.month, today.day + 1, timeZone).getTime() - instant.getTime();
}
