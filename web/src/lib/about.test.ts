import { describe, expect, it } from "vitest";
import { aboutIntro, calendarFacts, dayOfYear, halfBirthday, listNames, monthIntro, weekday } from "./about";
import { allMonthDays } from "./birthday";

const oct7 = { month: 10, day: 7 };
const feb29 = { month: 2, day: 29 };

describe("calendar facts", () => {
  it("counts the day of the year in a common year", () => {
    expect(dayOfYear({ month: 1, day: 1 })).toBe(1);
    expect(dayOfYear({ month: 2, day: 28 })).toBe(59);
    expect(dayOfYear(feb29)).toBe(60);
    expect(dayOfYear({ month: 3, day: 1 })).toBe(60);
    expect(dayOfYear(oct7)).toBe(280);
    expect(dayOfYear({ month: 12, day: 31 })).toBe(365);
  });

  it("names the weekday in a given year", () => {
    expect(weekday(oct7, 2026)).toBe("Wednesday");
    expect(weekday(feb29, 2028)).toBe("Tuesday");
    expect(weekday({ month: 1, day: 1 }, 2027)).toBe("Friday");
  });

  it("joins names like a sentence", () => {
    expect(listNames([])).toBe("");
    expect(listNames(["Ana"])).toBe("Ana");
    expect(listNames(["Ana", "Ben"])).toBe("Ana and Ben");
    expect(listNames(["Ana", "Ben", "Cy"])).toBe("Ana, Ben and Cy");
  });
});

describe("the About paragraph", () => {
  const base = { md: oct7, year: 2026, famous: [], leader: null, openBid: "$5" };

  it("states the date's own facts", () => {
    const text = aboutIntro(base).join(" ");
    expect(text).toContain("October 7 is the 280th day of the year (281st in leap years). In 2026 it falls on a Wednesday.");
    expect(text).toMatch(/It's the \d+(st|nd|rd|th) most common birthday in the US, with about [\d,]+ babies born on it each year, /);
    // Sign, stone and flower are on the cards below, not repeated here.
    expect(text).not.toContain("Libra");
  });

  it("leaves out the leap-year note in January and February", () => {
    expect(aboutIntro({ ...base, md: { month: 2, day: 3 } })[0]).toBe(
      "February 3 is the 34th day of the year. In 2026 it falls on a Tuesday.",
    );
  });

  it("names up to three famous people and the board's leader", () => {
    const text = aboutIntro({
      ...base,
      famous: ["Simon Cowell", "Toni Braxton", "Yo-Yo Ma", "Fourth Person"],
      leader: { name: "Jess Moreno", total: "$240" },
    }).join(" ");
    expect(text).toContain("Famous October 7 birthdays include Simon Cowell, Toni Braxton and Yo-Yo Ma.");
    expect(text).not.toContain("Fourth Person");
    expect(text).toContain("On mybday.lol, Jess Moreno leads the October 7, 2026 board with $240.");
  });

  it("invites the first bid on an empty board", () => {
    expect(aboutIntro(base).at(-1)).toBe(
      "Nobody has claimed October 7, 2026 on mybday.lol yet. The first bid takes the top spot from $5.",
    );
  });

  it("explains leap day", () => {
    const text = aboutIntro({ ...base, md: feb29, year: 2028 }).join(" ");
    expect(text).toContain("February 29 is leap day, the 60th day of a leap year.");
    expect(text).toContain("the next one is Tuesday, February 29, 2028.");
    expect(text).toContain("the rarest birthday of all");
  });

  it("is different for every date", () => {
    const all = allMonthDays().map((md) => aboutIntro({ ...base, md }).join(" "));
    expect(new Set(all).size).toBe(366);
  });
});

describe("the month paragraph", () => {
  it("names the most common and rarest dates, the signs, stone and flower", () => {
    const text = monthIntro(10, 31, 3).join(" ");
    expect(text).toContain("October has 31 birthdays, and every one has its own board.");
    expect(text).toMatch(/The most common is October \d+, the \d+(st|nd|rd|th) most common birthday in the US/);
    expect(text).toContain("October birthdays are Libra from October 1 to 22 and Scorpio from October 23 to 31");
    expect(text).toContain("opal as the birthstone and the marigold as the birth flower.");
    expect(text).toContain("3 of its 31 dates have a #1 on this year's boards so far.");
  });

  it("mentions leap day in February and an unclaimed month", () => {
    const text = monthIntro(2, 29, 0).join(" ");
    expect(text).toContain("February has 29 birthdays, leap day included");
    expect(text).toContain("None of its 29 dates has been claimed on this year's boards yet.");
  });
});

describe("numbers in the paragraphs", () => {
  it("rounds births to the nearest 100, like the rank card", () => {
    expect(aboutIntro({ md: oct7, year: 2026, famous: [], leader: null, openBid: "$5" }).join(" ")).toMatch(
      /with about \d{1,2},\d00 babies born on it each year/,
    );
    expect(monthIntro(10, 31, 0).join(" ")).toMatch(/with about \d{1,2},\d00 babies a year/);
  });
});

describe("calendar fact cards", () => {
  it("finds the half birthday, clamping to the month's last day", () => {
    expect(halfBirthday(oct7)).toEqual({ month: 4, day: 7 });
    expect(halfBirthday({ month: 8, day: 31 })).toEqual({ month: 2, day: 28 });
    expect(halfBirthday({ month: 12, day: 31 })).toEqual({ month: 6, day: 30 });
    expect(halfBirthday(feb29)).toEqual({ month: 8, day: 29 });
  });

  it("gives the half birthday, the next weekday and the day of the year", () => {
    expect(calendarFacts(oct7, 2027)).toEqual([
      { key: "Half birthday", value: "April 7", sub: "Six months after October 7" },
      { key: "Next one", value: "Thursday", sub: "October 7, 2027" },
      { key: "Day of the year", value: "280th", sub: "281st in leap years" },
    ]);
    expect(calendarFacts({ month: 1, day: 5 }, 2027)[2]!.sub).toBe("Same in leap years");
    expect(calendarFacts(feb29, 2028)[2]).toEqual({ key: "Day of the year", value: "60th", sub: "Leap years only" });
  });
});
