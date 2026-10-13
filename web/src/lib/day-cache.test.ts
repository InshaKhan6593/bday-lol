import { describe, expect, it } from "vitest";
import { personSlug, uniqueSlug } from "./people";
import { dayParam, instantOn, isPersonPart, parseDayParam, savedRoutes } from "./day-cache";

const ET = "America/New_York";

describe("the Eastern day in a saved page's address", () => {
  it("is the date in Eastern Time, not UTC", () => {
    // 11:30 PM ET on Oct 11 is already Oct 12 in UTC.
    expect(dayParam(new Date("2026-10-11T23:30:00-04:00"), ET)).toBe("2026-10-11");
    expect(dayParam(new Date("2026-10-12T00:00:00-04:00"), ET)).toBe("2026-10-12");
  });

  it("changes exactly at midnight ET, in summer and winter time", () => {
    expect(dayParam(new Date("2026-07-04T03:59:59.999Z"), ET)).toBe("2026-07-03");
    expect(dayParam(new Date("2026-07-04T04:00:00.000Z"), ET)).toBe("2026-07-04");
    expect(dayParam(new Date("2026-12-25T04:59:59.999Z"), ET)).toBe("2026-12-24");
    expect(dayParam(new Date("2026-12-25T05:00:00.000Z"), ET)).toBe("2026-12-25");
  });

  it("pads months and days", () => {
    expect(dayParam(new Date("2027-01-05T12:00:00-05:00"), ET)).toBe("2027-01-05");
  });

  it("reads a day back", () => {
    expect(parseDayParam("2026-10-11")).toEqual({ year: 2026, month: 10, day: 11 });
    expect(parseDayParam("2028-02-29")).toEqual({ year: 2028, month: 2, day: 29 });
  });

  it("refuses anything that isn't a real date", () => {
    for (const bad of ["", "today", "2026-10-7", "2026-13-01", "2026-02-30", "2027-02-29", "2026-10-11x", "../etc"]) {
      expect(parseDayParam(bad)).toBeNull();
    }
  });
});

describe("the instant a saved page is drawn with", () => {
  const oct11 = { year: 2026, month: 10, day: 11 };

  it("is now, while now is inside that day", () => {
    const noon = new Date("2026-10-11T12:00:00-04:00");
    expect(instantOn(oct11, noon, ET)).toEqual(noon);
  });

  it("is the day's last moment when it is drawn after midnight", () => {
    const late = instantOn(oct11, new Date("2026-10-12T00:00:00.250-04:00"), ET);
    expect(late.toISOString()).toBe("2026-10-12T03:59:59.999Z");
    expect(dayParam(late, ET)).toBe("2026-10-11");
  });

  it("is the day's first moment when it is drawn early", () => {
    const early = instantOn(oct11, new Date("2026-10-10T23:59:59-04:00"), ET);
    expect(early.toISOString()).toBe("2026-10-11T04:00:00.000Z");
    expect(dayParam(early, ET)).toBe("2026-10-11");
  });

  it("handles the 23- and 25-hour days when the clocks change", () => {
    // Nov 1, 2026: clocks go back, the day is 25 hours long.
    const nov1 = { year: 2026, month: 11, day: 1 };
    const end = instantOn(nov1, new Date("2026-11-05T12:00:00Z"), ET);
    expect(end.toISOString()).toBe("2026-11-02T04:59:59.999Z");
    expect(dayParam(end, ET)).toBe("2026-11-01");
  });
});

describe("where saved pages live", () => {
  it("puts the day in the address", () => {
    expect(savedRoutes.home("2026-10-11")).toBe("/home/2026-10-11");
    expect(savedRoutes.date({ month: 10, day: 7 }, "2026-10-11")).toBe("/october-7/~day/2026-10-11");
  });
});

describe("a personal link's saved copy", () => {
  it("sits under the date's copy for the same day", () => {
    expect(savedRoutes.person({ month: 10, day: 7 }, "2026-10-11", "sam-rivera")).toBe("/october-7/~day/2026-10-11/sam-rivera");
  });

  it("takes only a name the site could have made", () => {
    for (const ok of ["sam", "sam-rivera", "sam-rivera-2", "birthday", "x9", "a".repeat(64)]) expect(isPersonPart(ok), ok).toBe(true);
    for (const bad of ["", "Sam", "sam_rivera", "-sam", "sam-", "sam--rivera", "sam rivera", "sam/rivera", "~day", "..", "sám", "a".repeat(65)]) {
      expect(isPersonPart(bad), bad).toBe(false);
    }
  });

  it("takes every link name the site makes, however odd the person's name", () => {
    const odd = ["Lucía Gómez", "Mary-Catherine O'Neil", "Zoë 🎂", "  Isla   Brown ", "!!!", "X Æ A-12", "a".repeat(80), "D'Angelo -- Jr.", "李小龍", "9lives"];
    for (const name of odd) {
      const slug = personSlug(name);
      expect(isPersonPart(slug), `${name} → ${slug}`).toBe(true);
      expect(isPersonPart(uniqueSlug(slug, [slug, `${slug}-2`])), name).toBe(true);
    }
  });

  it("is never the date page's share image", () => {
    expect(isPersonPart("opengraph-image")).toBe(false);
  });
});
