import { formatLong, isLeapDay, toKey, type MonthDay } from "./birthday";
import { COMMONNESS } from "./commonness-data";
import { ordinal } from "./facts";

/** Ranks above this read "one of the least common" instead of "the 312th most common" (06-seo.md). */
const LEAST_COMMON_FROM = 301;

export type Commonness = {
  /** 1 = most common, 366 = Feb 29. */
  rank: number;
  /** Average US births on this date each year it occurs (FiveThirtyEight data). */
  births: number;
  /** The big number on the card: "#118". */
  headline: string;
  /** "The 118th most common birthday in the US, out of 366" */
  line: string;
  /** "About 11,400 US babies are born on October 7 each year." */
  sub: string;
};

/** "How common is it" card in "About [date] birthdays" (06-seo.md §1, mockup Day.dc.html). */
export function commonness(md: MonthDay): Commonness {
  const [rank, births] = COMMONNESS[toKey(md)]!;
  const label = formatLong(md);
  if (isLeapDay(md)) {
    return {
      rank,
      births,
      headline: `#${rank}`,
      line: "The rarest birthday of the year",
      sub: "It only comes once every four years.",
    };
  }
  return {
    rank,
    births,
    headline: `#${rank}`,
    line:
      rank >= LEAST_COMMON_FROM
        ? "One of the least common birthdays in the US, out of 366"
        : `The ${ordinal(rank)} most common birthday in the US, out of 366`,
    // The mockup rounds to the nearest 100 ("About 11,200 US babies…").
    sub: `About ${roundTo100(births).toLocaleString("en-US")} US babies are born on ${label} each year.`,
  };
}

/** Births are quoted to the nearest 100, like the mockup ("About 11,200 US babies…"). */
export function roundTo100(n: number): number {
  return Math.round(n / 100) * 100;
}

/** Average births on an ordinary day (Feb 29 excluded), for "x% more than an average day". */
export const AVERAGE_DAY_BIRTHS = Math.round(
  Object.entries(COMMONNESS)
    .filter(([key]) => key !== "02-29")
    .reduce((sum, [, [, births]]) => sum + births, 0) / 365,
);

/** The most and least common dates in a month (Feb 29 left out: it's rare by the calendar, not by choice). */
export function monthExtremes(month: number): { most: MonthDay; least: MonthDay } {
  const days = Object.entries(COMMONNESS)
    .filter(([key]) => Number(key.slice(0, 2)) === month && key !== "02-29")
    .sort((a, b) => a[1][0] - b[1][0])
    .map(([key]) => ({ month, day: Number(key.slice(3)) }));
  return { most: days[0]!, least: days[days.length - 1]! };
}
