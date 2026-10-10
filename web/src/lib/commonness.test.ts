import { describe, expect, it } from "vitest";
import { allMonthDays, toKey } from "./birthday";
import { AVERAGE_DAY_BIRTHS, commonness, monthExtremes } from "./commonness";
import { COMMONNESS } from "./commonness-data";

describe("commonness data", () => {
  it("ranks all 366 dates once each, 1 to 366", () => {
    const ranks = allMonthDays().map((md) => COMMONNESS[toKey(md)]![0]);
    expect(ranks).toHaveLength(366);
    expect(new Set(ranks).size).toBe(366);
    expect(Math.min(...ranks)).toBe(1);
    expect(Math.max(...ranks)).toBe(366);
  });

  it("matches the well-known results: Sep 9 most common, Dec 25 least, Feb 29 last of all", () => {
    expect(commonness({ month: 9, day: 9 }).rank).toBe(1);
    expect(commonness({ month: 12, day: 25 }).rank).toBe(365);
    expect(commonness({ month: 2, day: 29 }).rank).toBe(366);
  });

  it("ranks by average births: a higher rank never has more births", () => {
    const rows = Object.values(COMMONNESS)
      .filter(([rank]) => rank < 366)
      .sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < rows.length; i++) expect(rows[i]![1]).toBeLessThanOrEqual(rows[i - 1]![1]);
  });
});

describe("the rank card copy", () => {
  it("reads like the mockup on an ordinary date", () => {
    const c = commonness({ month: 10, day: 7 });
    expect(c.headline).toBe(`#${c.rank}`);
    expect(c.line).toMatch(/^The \d+(st|nd|rd|th) most common birthday in the US, out of 366$/);
    expect(c.sub).toMatch(/^About \d{1,2},\d00 US babies are born on October 7 each year\.$/);
  });

  it("uses ordinals correctly", () => {
    const first = commonness({ month: 9, day: 9 });
    expect(first.line).toBe("The 1st most common birthday in the US, out of 366");
  });

  it("says 'one of the least common' past rank 300", () => {
    expect(commonness({ month: 12, day: 25 }).line).toBe("One of the least common birthdays in the US, out of 366");
  });

  it("has its own copy for Feb 29", () => {
    const c = commonness({ month: 2, day: 29 });
    expect(c.headline).toBe("#366");
    expect(c.line).toBe("The rarest birthday of the year");
    expect(c.sub).toBe("It only comes once every four years.");
  });
});

describe("month extremes and averages", () => {
  it("finds September's most common day and skips Feb 29 in February", () => {
    expect(monthExtremes(9).most).toEqual({ month: 9, day: 9 });
    expect(monthExtremes(2).least).not.toEqual({ month: 2, day: 29 });
    expect(monthExtremes(12).least).toEqual({ month: 12, day: 25 });
  });

  it("has a plausible average day (about 11,000 US births)", () => {
    expect(AVERAGE_DAY_BIRTHS).toBeGreaterThan(10000);
    expect(AVERAGE_DAY_BIRTHS).toBeLessThan(12000);
  });
});
