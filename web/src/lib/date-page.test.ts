import { describe, expect, it } from "vitest";
import { formatLongNb, parseShortSlug } from "./birthday";
import {
  adjacentDay,
  calendarCells,
  claimRankText,
  ctaCopy,
  dateStatus,
  filterByName,
  formatClock,
  giftsOpenText,
  heldText,
  searchCountText,
  statusText,
} from "./date-page";
import { birthFlower, birthstone, ordinal, zodiacSign } from "./facts";
import { routes } from "./routes";

const ET = "America/New_York";
const NB = " ";
const rules = { minOpenBidCents: 500, minStepCents: 100 };
const oct7 = { month: 10, day: 7 };
const feb29 = { month: 2, day: 29 };
// Noon ET on October 7, 2026 (the mockup's "today").
const NOON_OCT_7 = new Date("2026-10-07T12:00:00-04:00");

describe("previous and next day", () => {
  it("steps through the 366-day calendar, Feb 29 included", () => {
    expect(adjacentDay(oct7, 1)).toEqual({ month: 10, day: 8 });
    expect(adjacentDay(oct7, -1)).toEqual({ month: 10, day: 6 });
    expect(adjacentDay({ month: 2, day: 28 }, 1)).toEqual(feb29);
    expect(adjacentDay(feb29, 1)).toEqual({ month: 3, day: 1 });
    expect(adjacentDay({ month: 3, day: 1 }, -1)).toEqual(feb29);
    expect(adjacentDay({ month: 10, day: 31 }, 1)).toEqual({ month: 11, day: 1 });
    expect(adjacentDay({ month: 5, day: 1 }, -1)).toEqual({ month: 4, day: 30 });
  });

  it("wraps Dec 31 to Jan 1 and back", () => {
    expect(adjacentDay({ month: 12, day: 31 }, 1)).toEqual({ month: 1, day: 1 });
    expect(adjacentDay({ month: 1, day: 1 }, -1)).toEqual({ month: 12, day: 31 });
  });
});

describe("status line", () => {
  it("knows today, later this year, and passed dates", () => {
    expect(dateStatus(oct7, NOON_OCT_7, ET)).toEqual({ kind: "today" });
    expect(dateStatus({ month: 10, day: 10 }, NOON_OCT_7, ET)).toEqual({ kind: "soon", days: 3 });
    expect(dateStatus({ month: 10, day: 1 }, NOON_OCT_7, ET)).toEqual({ kind: "next", year: 2027 });
  });

  it("words it like the mockup", () => {
    expect(statusText({ month: 10, day: 10 }, { kind: "soon", days: 3 })).toBe("In 3 days · Bidding is open");
    expect(statusText({ month: 10, day: 8 }, { kind: "soon", days: 1 })).toBe("In 1 day · Bidding is open");
    expect(statusText({ month: 10, day: 1 }, { kind: "next", year: 2027 })).toBe(
      "Next one: Oct 1, 2027 · Bidding is open",
    );
  });

  it("points Feb 29 at the next leap year", () => {
    expect(dateStatus(feb29, NOON_OCT_7, ET)).toEqual({ kind: "next", year: 2028 });
    // In a leap year before Feb 29 it is simply coming up.
    expect(dateStatus(feb29, new Date("2028-02-20T12:00:00-05:00"), ET)).toEqual({ kind: "soon", days: 9 });
  });

  it("treats Jan 1 seen on Dec 31 as next year's date", () => {
    const dec31 = new Date("2026-12-31T12:00:00-05:00");
    expect(dateStatus({ month: 1, day: 1 }, dec31, ET)).toEqual({ kind: "next", year: 2027 });
  });

  it("uses Eastern Time: 11 PM ET on Oct 6 is not yet Oct 7", () => {
    expect(dateStatus(oct7, new Date("2026-10-07T03:00:00Z"), ET)).toEqual({ kind: "soon", days: 1 });
  });
});

describe("gifts open pill", () => {
  it("adds the year only when the date is next year", () => {
    expect(giftsOpenText({ month: 10, day: 10 }, { kind: "soon", days: 3 })).toBe("Gifts open Oct 10");
    expect(giftsOpenText({ month: 10, day: 1 }, { kind: "next", year: 2027 })).toBe("Gifts open Oct 1, 2027");
    expect(giftsOpenText(feb29, { kind: "next", year: 2028 })).toBe("Gifts open Feb 29, 2028");
  });
});

describe("held the homepage", () => {
  const at = (hhmm: string) => new Date(`2026-10-07T${hhmm}:00-04:00`);

  it("formats clock times in ET with a plain space", () => {
    expect(formatClock(at("14:40"), ET)).toBe("2:40 PM");
    expect(formatClock(at("00:00"), ET)).toBe("12:00 AM");
  });

  it("says 'since' for the current #1", () => {
    expect(heldText([{ startedAt: at("14:40"), endedAt: null }], ET)).toBe("On the homepage since 2:40 PM");
  });

  it("shows the latest finished stint for people who lost #1", () => {
    expect(
      heldText(
        [
          { startedAt: at("00:00"), endedAt: at("03:00") },
          { startedAt: at("09:12"), endedAt: at("14:40") },
        ],
        ET,
      ),
    ).toBe("Held the homepage 9:12 AM – 2:40 PM");
  });

  it("prefers 'since' when someone took #1 back", () => {
    expect(
      heldText(
        [
          { startedAt: at("08:00"), endedAt: at("09:00") },
          { startedAt: at("11:00"), endedAt: null },
        ],
        ET,
      ),
    ).toBe("On the homepage since 11:00 AM");
  });

  it("is empty for people who never held #1", () => {
    expect(heldText([], ET)).toBeNull();
  });
});

describe("claim bar and tooltips", () => {
  it("offers the top spot at top + $1, or $5 on an empty date", () => {
    expect(ctaCopy({ md: oct7, isToday: true, topTotalCents: 24_000, picked: null, rules })).toEqual({
      title: "Own the top spot",
      sub: "Bid $241 or more.",
      button: `Bid on October${NB}7`,
      rank: null,
    });
    expect(ctaCopy({ md: oct7, isToday: false, topTotalCents: null, picked: null, rules }).sub).toBe(
      "Bid $5 or more.",
    );
  });

  it("switches to the tapped rank", () => {
    const picked = { rank: 2, totalCents: 22_500 };
    expect(ctaCopy({ md: oct7, isToday: true, topTotalCents: 24_000, picked, rules })).toEqual({
      title: "Claim today’s #2 for $226",
      sub: "Bid $226 or more to take #2.",
      button: "Claim #2 for $226",
      rank: 2,
    });
    expect(
      ctaCopy({ md: { month: 10, day: 12 }, isToday: false, topTotalCents: 24_000, picked, rules }).title,
    ).toBe(`Claim October${NB}12’s #2 for $226`);
  });

  it("prices each card at their total + $1", () => {
    expect(claimRankText(24_000, rules)).toBe("Claim this rank for $241");
  });

  it("links the claim page with the date and rank", () => {
    expect(routes.claim(oct7)).toBe("/claim?date=october-7");
    expect(routes.claim(oct7, 2)).toBe("/claim?date=october-7&rank=2");
    expect(routes.claim(oct7, 1)).toBe("/claim?date=october-7");
    expect(routes.month(10)).toBe("/october");
  });
});

describe("name search", () => {
  const people = [{ name: "Jess Moreno" }, { name: "Tyler Brooks" }, { name: "Jordan Lee" }];

  it("filters by name, ignoring case and spaces", () => {
    expect(filterByName(people, "  lE ").map((p) => p.name)).toEqual(["Tyler Brooks", "Jordan Lee"]);
    expect(filterByName(people, "brooks")).toEqual([{ name: "Tyler Brooks" }]);
    expect(filterByName(people, "")).toBe(people);
    expect(filterByName(people, "zed")).toEqual([]);
  });

  it("counts matches", () => {
    expect(searchCountText(3, 8)).toBe("3 of 8 people");
  });
});

describe("date picker", () => {
  const tops = { "10-07": 24_000, "10-09": 8_500 };

  it("lists every day of the month with its top bid or 'open'", () => {
    const cells = calendarCells(10, tops, { month: 10, day: 9 }, oct7);
    expect(cells).toHaveLength(31);
    expect(cells[6]).toMatchObject({ sub: "$240", state: "today", aria: "October 7, top bid $240" });
    expect(cells[8]).toMatchObject({ sub: "$85", state: "selected" });
    expect(cells[0]).toMatchObject({ sub: "open", state: "plain", aria: "October 1, unclaimed" });
  });

  it("always shows 29 days in February", () => {
    expect(calendarCells(2, {}, oct7, oct7)).toHaveLength(29);
  });

  it("marks the selected day over today", () => {
    expect(calendarCells(10, tops, oct7, oct7)[6]!.state).toBe("selected");
  });
});

describe("slugs and labels", () => {
  it("redirects the mockup's short slugs", () => {
    expect(parseShortSlug("oct-7")).toEqual(oct7);
    expect(parseShortSlug("feb-29")).toEqual(feb29);
    for (const bad of ["oct-07", "oct-32", "feb-30", "october-7", "xyz-1", "oct"]) {
      expect(parseShortSlug(bad)).toBeNull();
    }
  });

  it("keeps month and day together", () => {
    expect(formatLongNb(oct7)).toBe(`October${NB}7`);
  });
});

describe("about facts", () => {
  it("finds the zodiac sign, including the edges", () => {
    expect(zodiacSign(oct7)).toBe("Libra");
    expect(zodiacSign({ month: 10, day: 22 })).toBe("Libra");
    expect(zodiacSign({ month: 10, day: 23 })).toBe("Scorpio");
    expect(zodiacSign({ month: 1, day: 19 })).toBe("Capricorn");
    expect(zodiacSign({ month: 1, day: 20 })).toBe("Aquarius");
    expect(zodiacSign({ month: 12, day: 22 })).toBe("Capricorn");
    expect(zodiacSign(feb29)).toBe("Pisces");
  });

  it("knows each month's birthstone and flower", () => {
    expect([birthstone(10), birthFlower(10)]).toEqual(["Opal", "Marigold"]);
    expect([birthstone(1), birthFlower(12)]).toEqual(["Garnet", "Narcissus"]);
  });

  it("writes ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111, 287].map(ordinal)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st", "111th", "287th",
    ]);
  });
});
