import { describe, expect, it } from "vitest";
import { knownFor, occupationLabel, oneBirthDateEach, qualifies, rankFamous, type FamousCandidate } from "./famous";

// Occupation → the root classes it falls under (what the subclass lookup returns).
const roots = new Map<string, Set<string>>([
  ["Q10800557", new Set(["Q33999"])], // film actor → actor
  ["Q937857", new Set(["Q50995749", "Q2066131"])], // association football player → athlete
  ["Q82955", new Set(["Q82955"])], // politician
  ["Q40348", new Set()], // lawyer: no root of ours
]);

describe("who counts as entertainment", () => {
  it("takes actors, athletes and the like", () => {
    expect(qualifies(["Q10800557"], roots)).toBe(true);
    expect(qualifies(["Q40348", "Q937857"], roots)).toBe(true);
  });

  it("leaves out people with no entertainment occupation", () => {
    expect(qualifies(["Q40348"], roots)).toBe(false);
    expect(qualifies([], roots)).toBe(false);
  });

  it("leaves out politicians even if they also acted (07 A4)", () => {
    expect(qualifies(["Q10800557", "Q82955"], roots)).toBe(false);
  });

  it("labels the first entertainment occupation", () => {
    expect(occupationLabel(["Q40348", "Q937857"], roots)).toBe("athlete");
    expect(occupationLabel(["Q10800557"], roots)).toBe("actor");
  });
});

describe("what they're known for", () => {
  it("uses a short description as is", () => {
    expect(knownFor("American singer", "singer")).toBe("American singer");
  });

  it("drops parentheses and trailing clauses", () => {
    expect(knownFor("British actor (born 1982)", "actor")).toBe("British actor");
    expect(knownFor("American rapper, singer, and record producer", "rapper")).toBe("American rapper");
  });

  it("says soccer, not association football", () => {
    expect(knownFor("Brazilian association football player", "athlete")).toBe("Brazilian soccer player");
    expect(knownFor("Dutch association football player and manager", "athlete")).toBe("Dutch soccer player and manager");
    expect(knownFor("Spanish association football manager", "athlete")).toBe("Spanish soccer manager");
  });

  it("cuts a long description at 'and'", () => {
    expect(knownFor("English musician and lead vocalist of Radiohead", "musician")).toBe("English musician");
  });

  it("falls back to the occupation when the description is missing, dated or too long", () => {
    expect(knownFor(undefined, "actor")).toBe("actor");
    expect(knownFor("", "actor")).toBe("actor");
    expect(knownFor("Member of the 1998 World Cup squad", "athlete")).toBe("athlete");
    expect(knownFor("Internationally celebrated multi-instrumentalist performer", "musician")).toBe("musician");
  });
});

describe("ranking and cleanup", () => {
  it("ranks by pageviews, then language editions, then id", () => {
    const people = [
      { sourceId: "Q3", pageviews: 10, sitelinks: 50 },
      { sourceId: "Q1", pageviews: 99, sitelinks: 20 },
      { sourceId: "Q4", pageviews: 10, sitelinks: 80 },
      { sourceId: "Q2", pageviews: 10, sitelinks: 50 },
    ];
    expect(rankFamous(people).map((p) => p.sourceId)).toEqual(["Q1", "Q4", "Q2", "Q3"]);
  });

  it("keeps one row per person and drops people whose birth date is disputed", () => {
    const base: FamousCandidate = { sourceId: "", birthDate: "", sitelinks: 20, article: "", occupations: [] };
    const rows = [
      { ...base, sourceId: "Q1", birthDate: "1980-10-07" },
      { ...base, sourceId: "Q1", birthDate: "1980-10-07" },
      { ...base, sourceId: "Q2", birthDate: "1970-10-07" },
      { ...base, sourceId: "Q2", birthDate: "1971-10-07" },
      { ...base, sourceId: "Q3", birthDate: "1990-10-07" },
    ];
    expect(oneBirthDateEach(rows).map((r) => r.sourceId)).toEqual(["Q1", "Q3"]);
  });
});
