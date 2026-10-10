import { DAYS_IN_MONTH, formatLong, isLeapDay, MONTHS, type MonthDay } from "./birthday";
import { AVERAGE_DAY_BIRTHS, commonness, monthExtremes, roundTo100 } from "./commonness";
import { birthFlower, birthstone, ordinal, signsInMonth } from "./facts";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CUMULATIVE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

/** Day of the year in a common year (Feb 29 counts as 60, the leap-year number). */
export function dayOfYear({ month, day }: MonthDay): number {
  if (month === 2 && day === 29) return 60;
  return CUMULATIVE[month - 1]! + day;
}

/** "Wednesday" for October 7, 2026. */
export function weekday(md: MonthDay, year: number): string {
  return WEEKDAYS[new Date(Date.UTC(year, md.month - 1, md.day)).getUTCDay()]!;
}

/** "Simon Cowell, Toni Braxton and Yo-Yo Ma" */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

type IntroInput = {
  md: MonthDay;
  /** The board's year: the next time this date comes round. */
  year: number;
  /** Best-known names first (the famous list). */
  famous: string[];
  /** Today's #1 on this date's board, if anyone has bid. */
  leader: { name: string; total: string } | null;
  openBid: string;
};

/**
 * The paragraph under "About [date] birthdays". Every sentence carries a fact
 * that is different for each date (day of the year, weekday, how common it is,
 * who's famous, who leads), so the 366 pages read as 366 pages and not one
 * template with the date swapped (claude-seo seo-programmatic). Sign, stone and
 * flower are left to the cards right below it.
 */
export function aboutIntro({ md, year, famous, leader, openBid }: IntroInput): string[] {
  const label = formatLong(md);
  const c = commonness(md);
  const sentences: string[] = [];

  if (isLeapDay(md)) {
    sentences.push(
      `${label} is leap day, the 60th day of a leap year. It only comes once every four years: the next one is ${weekday(md, year)}, ${label}, ${year}.`,
      `About ${roundTo100(c.births).toLocaleString("en-US")} US babies are born on it each time, but spread over four years that makes it the rarest birthday of all.`,
    );
  } else {
    const n = dayOfYear(md);
    const leapShift = md.month > 2 ? ` (${ordinal(n + 1)} in leap years)` : "";
    const diff = Math.round((100 * (c.births - AVERAGE_DAY_BIRTHS)) / AVERAGE_DAY_BIRTHS);
    const vsAverage =
      diff === 0 ? "about the same as an average day" : `${Math.abs(diff)}% ${diff > 0 ? "more" : "fewer"} than on an average day`;
    sentences.push(
      `${label} is the ${ordinal(n)} day of the year${leapShift}. In ${year} it falls on a ${weekday(md, year)}.`,
      `It's the ${ordinal(c.rank)} most common birthday in the US, with about ${roundTo100(c.births).toLocaleString("en-US")} babies born on it each year, ${vsAverage}.`,
    );
  }

  if (famous.length > 0) sentences.push(`Famous ${label} birthdays include ${listNames(famous.slice(0, 3))}.`);
  sentences.push(
    leader
      ? `On mybday.lol, ${leader.name} leads the ${label}, ${year} board with ${leader.total}.`
      : `Nobody has claimed ${label}, ${year} on mybday.lol yet. The first bid takes the top spot from ${openBid}.`,
  );
  return sentences;
}

/**
 * The paragraph under "October birthdays" on a month page: how common its
 * dates are, its star signs, stone and flower, and how many dates have a #1.
 */
export function monthIntro(month: number, days: number, claimed: number): string[] {
  const name = MONTHS[month - 1]!;
  const { most, least } = monthExtremes(month);
  const top = commonness(most);
  const bottom = commonness(least);
  const signs = signsInMonth(month, days);
  const signText = signs
    .map((s) => `${s.sign} from ${name} ${s.from} to ${s.to}`)
    .join(" and ");
  return [
    `${name} has ${days} birthdays${month === 2 ? ", leap day included" : ""}, and every one has its own board.`,
    `The most common is ${formatLong(most)}, the ${ordinal(top.rank)} most common birthday in the US with about ${roundTo100(top.births).toLocaleString("en-US")} babies a year, and the rarest is ${formatLong(least)}, ${ordinal(bottom.rank)} out of 366.`,
    `${name} birthdays are ${signText}, with ${birthstone(month).toLowerCase()} as the birthstone and the ${birthFlower(month).toLowerCase()} as the birth flower.`,
    claimed
      ? `${claimed} of its ${days} dates have a #1 on this year's boards so far.`
      : `None of its ${days} dates has been claimed on this year's boards yet.`,
  ];
}

/** Six months on, same day; a day the month doesn't have becomes its last day (Aug 31 → Feb 28). */
export function halfBirthday({ month, day }: MonthDay): MonthDay {
  const m = ((month + 5) % 12) + 1;
  const last = m === 2 ? 28 : DAYS_IN_MONTH[m - 1]!;
  return { month: m, day: Math.min(day, last) };
}

export type Fact = { key: string; value: string; sub: string };

/**
 * The second row of fact cards under the sign, stone and flower: half birthday,
 * the weekday it falls on next, and the day of the year. Each is a fact people
 * look up about their own birthday, and each is different for every date.
 */
export function calendarFacts(md: MonthDay, year: number): Fact[] {
  const label = formatLong(md);
  const n = dayOfYear(md);
  return [
    { key: "Half birthday", value: formatLong(halfBirthday(md)), sub: `Six months after ${label}` },
    { key: "Next one", value: weekday(md, year), sub: `${label}, ${year}` },
    {
      key: "Day of the year",
      value: ordinal(n),
      sub: isLeapDay(md) ? "Leap years only" : md.month > 2 ? `${ordinal(n + 1)} in leap years` : "Same in leap years",
    },
  ];
}
