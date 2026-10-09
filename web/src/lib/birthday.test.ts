import { describe, expect, it } from "vitest";
import {
  allMonthDays,
  boardClosesAt,
  boardOpensAt,
  currentBoardYear,
  daysUntil,
  isLeapYear,
  msUntilDayEnds,
  nextDates,
  parseKey,
  parseSlug,
  startOfDayIn,
  toKey,
  toSlug,
  zonedDate,
} from "./birthday";

const ET = "America/New_York";
const oct1 = { month: 10, day: 1 };
const oct7 = { month: 10, day: 7 };
const feb29 = { month: 2, day: 29 };

describe("calendar", () => {
  it("has 366 dates including Feb 29", () => {
    const days = allMonthDays();
    expect(days).toHaveLength(366);
    expect(days).toContainEqual(feb29);
  });

  it("checks leap years properly", () => {
    expect([2024, 2028, 2032, 2000].map(isLeapYear)).toEqual([true, true, true, true]);
    expect([2026, 2027, 1900, 2100].map(isLeapYear)).toEqual([false, false, false, false]);
  });
});

describe("keys and slugs", () => {
  it("round-trips keys", () => {
    expect(toKey(oct7)).toBe("10-07");
    expect(parseKey("10-07")).toEqual(oct7);
    expect(parseKey("02-30")).toBeNull();
  });

  it("parses date and month slugs", () => {
    expect(toSlug(oct7)).toBe("october-7");
    expect(parseSlug("october-7")).toEqual({ kind: "date", md: oct7 });
    expect(parseSlug("february-29")).toEqual({ kind: "date", md: feb29 });
    expect(parseSlug("october")).toEqual({ kind: "month", month: 10 });
  });

  it("rejects bad slugs", () => {
    for (const bad of ["october-07", "october-32", "february-30", "oct-7", "October-7", "foo"]) {
      expect(parseSlug(bad)).toBeNull();
    }
  });
});

describe("eastern time", () => {
  it("uses the ET calendar date, not UTC", () => {
    // 2026-10-08 02:00 UTC is still Oct 7, 10 PM in New York.
    expect(zonedDate(new Date("2026-10-08T02:00:00Z"), ET)).toEqual({ year: 2026, month: 10, day: 7 });
  });
});

describe("current board year", () => {
  it("client example: on Oct 12, 2026, claiming Oct 1 lands on the 2027 board", () => {
    expect(currentBoardYear(oct1, new Date("2026-10-12T15:00:00-04:00"), ET)).toBe(2027);
  });

  it("today's board stays open until midnight ET, then next year opens", () => {
    expect(currentBoardYear(oct7, new Date("2026-10-07T23:59:59-04:00"), ET)).toBe(2026);
    expect(currentBoardYear(oct7, new Date("2026-10-08T00:00:00-04:00"), ET)).toBe(2027);
  });

  it("Feb 29 always points at the next real Feb 29", () => {
    expect(currentBoardYear(feb29, new Date("2026-10-09T12:00:00-04:00"), ET)).toBe(2028);
    expect(currentBoardYear(feb29, new Date("2028-02-29T10:00:00-05:00"), ET)).toBe(2028);
    expect(currentBoardYear(feb29, new Date("2028-03-01T00:00:00-05:00"), ET)).toBe(2032);
    expect(currentBoardYear(feb29, new Date("2096-03-01T00:00:00-05:00"), ET)).toBe(2104); // 2100 is not a leap year
  });
});

describe("board open and close times", () => {
  it("closes at midnight ET after the date, during daylight saving", () => {
    expect(boardClosesAt(oct7, 2026, ET).toISOString()).toBe("2026-10-08T04:00:00.000Z");
  });

  it("closes at midnight ET after the date, in standard time", () => {
    expect(boardClosesAt({ month: 12, day: 25 }, 2026, ET).toISOString()).toBe("2026-12-26T05:00:00.000Z");
  });

  it("rolls Dec 31 over into the next year", () => {
    expect(boardClosesAt({ month: 12, day: 31 }, 2026, ET).toISOString()).toBe("2027-01-01T05:00:00.000Z");
  });

  it("opens the moment the previous year's board closes", () => {
    expect(boardOpensAt(oct7, 2027, ET)).toEqual(boardClosesAt(oct7, 2026, ET));
    expect(boardOpensAt(feb29, 2032, ET)).toEqual(boardClosesAt(feb29, 2028, ET));
  });
});

describe("countdowns", () => {
  it("counts calendar days in ET", () => {
    const at = new Date("2026-10-07T23:00:00-04:00");
    expect(daysUntil({ year: 2026, month: 10, day: 10 }, at, ET)).toBe(3);
    expect(daysUntil({ year: 2026, month: 10, day: 7 }, at, ET)).toBe(0);
  });

  it("measures time left in the day", () => {
    expect(msUntilDayEnds(new Date("2026-10-07T23:58:00-04:00"), ET)).toBe(2 * 60_000);
  });
});

describe("start of day", () => {
  it("is midnight ET, not midnight UTC", () => {
    expect(startOfDayIn(new Date("2026-10-07T23:00:00-04:00"), ET).toISOString()).toBe("2026-10-07T04:00:00.000Z");
  });
});

describe("next dates (Coming up)", () => {
  const md = (d: { month: number; day: number }) => `${d.month}-${d.day}`;

  it("rolls over the end of the year", () => {
    expect(nextDates({ year: 2026, month: 12, day: 30 }, 4).map(md)).toEqual(["12-31", "1-1", "1-2", "1-3"]);
  });

  it("skips Feb 29 in common years and includes it in leap years", () => {
    expect(nextDates({ year: 2027, month: 2, day: 27 }, 2).map(md)).toEqual(["2-28", "3-1"]);
    expect(nextDates({ year: 2028, month: 2, day: 27 }, 2).map(md)).toEqual(["2-28", "2-29"]);
  });

  it("carries the year of each date", () => {
    expect(nextDates({ year: 2026, month: 12, day: 31 }, 1)[0]).toEqual({ year: 2027, month: 1, day: 1 });
  });
});
