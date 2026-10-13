import { describe, expect, it } from "vitest";
import { parseSlug } from "./birthday";
import { allSavedPages, pagesAfterBoardChange, servedFromOldCopy } from "./warm";

describe("the pages a change to one board shows on", () => {
  it("are the homepage, the date, its month and the personal links given", () => {
    expect(pagesAfterBoardChange("10-07")).toEqual(["/", "/october-7", "/october"]);
    expect(pagesAfterBoardChange("02-29", ["sam-rivera", null, "ana-2"])).toEqual([
      "/",
      "/february-29",
      "/february",
      "/february-29/sam-rivera",
      "/february-29/ana-2",
    ]);
  });

  it("is only the homepage for a date that isn't one", () => {
    for (const bad of ["", "13-01", "02-30", "october-7", "../admin"]) expect(pagesAfterBoardChange(bad, ["x"])).toEqual(["/"]);
  });
});

describe("every saved page", () => {
  const pages = allSavedPages();

  it("is the homepage, three text pages, 12 months and 366 dates, each once", () => {
    expect(pages).toHaveLength(1 + 3 + 12 + 366);
    expect(new Set(pages).size).toBe(pages.length);
    expect(pages.slice(0, 4)).toEqual(["/", "/how-it-works", "/terms", "/privacy"]);
  });

  it("holds only addresses the site really has, February 29 included", () => {
    const slugs = pages.slice(4).map((p) => parseSlug(p.slice(1)));
    expect(slugs.every(Boolean)).toBe(true);
    expect(slugs.filter((s) => s!.kind === "month")).toHaveLength(12);
    expect(slugs.filter((s) => s!.kind === "date")).toHaveLength(366);
    expect(pages).toContain("/february-29");
    expect(pages).not.toContain("/february-30");
  });

  it("never points outside the site", () => {
    expect(pages.every((p) => p.startsWith("/") && !p.startsWith("//") && !p.includes(".."))).toBe(true);
  });
});

describe("an answer from a copy that was already saved", () => {
  it("is told from a freshly built one by the cache header", () => {
    expect(servedFromOldCopy("HIT")).toBe(true);
    expect(servedFromOldCopy("stale")).toBe(true);
    for (const fresh of ["MISS", "PRERENDER", "REVALIDATED", "BYPASS", "", null]) expect(servedFromOldCopy(fresh)).toBe(false);
  });
});
