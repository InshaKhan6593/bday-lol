import { describe, expect, it } from "vitest";
import { allMonthDays, DAYS_IN_MONTH, formatLong } from "./birthday";
import {
  HOW_DESCRIPTION,
  PRIVACY_DESCRIPTION,
  TERMS_DESCRIPTION,
  homeDescription,
  dateDescription,
  dateJsonLd,
  dateTitle,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  fitDescription,
  monthDescription,
  monthJsonLd,
  monthTitle,
  pageMetadata,
} from "./seo";

const inRange = (text: string) => text.length >= DESCRIPTION_MIN && text.length <= DESCRIPTION_MAX;
const famous = ["Shawn Ashmore", "Simon Cowell", "Lewis Capaldi"];
const leader = { name: "Jess Moreno", totalCents: 24000 };

describe("fitting a description", () => {
  it("keeps sentences in order while they fit, then pads with extras to reach 120", () => {
    const text = fitDescription(["A".repeat(100) + "."], ["Extra one.", "Extra two.", "Never needed."]);
    expect(text).toBe(`${"A".repeat(100)}. Extra one. Extra two.`);
    expect(inRange(text)).toBe(true);
  });

  it("skips a sentence that would overflow 160", () => {
    const text = fitDescription(["A".repeat(90) + ".", "B".repeat(80) + ".", "C".repeat(40) + "."]);
    expect(text).toBe(`${"A".repeat(90)}. ${"C".repeat(40)}.`);
  });
});

describe("date pages", () => {
  it("titles fit in 60 characters for every date, with no brand suffix needed", () => {
    for (const md of allMonthDays()) expect(dateTitle(md).length).toBeLessThanOrEqual(60);
    expect(dateTitle({ month: 10, day: 7 })).toBe("October 7 Birthday: Famous People, Facts & Who's #1");
  });

  it("descriptions are 120–160 characters and unique, with or without famous people and a leader", () => {
    for (const variant of [
      { famous, leader },
      { famous: [], leader: null },
      { famous: ["A Very Long Stage Name Indeed", "Another Rather Long Name", "Third"], leader: { name: "Maximiliana Featherstonehaugh-Smythe", totalCents: 1234500 } },
    ]) {
      const all = allMonthDays().map((md) => dateDescription({ md, year: 2027, openBidCents: 500, ...variant }));
      for (const d of all) expect(inRange(d), `${d.length}: ${d}`).toBe(true);
      expect(new Set(all).size).toBe(366);
    }
  });

  it("leads with who was born that day, then how common it is, then the board", () => {
    expect(dateDescription({ md: { month: 10, day: 7 }, year: 2026, famous, leader, openBidCents: 500 })).toBe(
      "Born on October 7: Shawn Ashmore, Simon Cowell and Lewis Capaldi. It's the 118th most common birthday in the US. Jess Moreno leads the 2026 board with $240.",
    );
  });

  it("never opens by repeating the title (claude-seo templated-metadata check)", () => {
    const md = { month: 10, day: 7 };
    const d = dateDescription({ md, year: 2026, famous: [], leader: null, openBidCents: 500 });
    expect(d.startsWith(formatLong(md))).toBe(false);
    expect(d).not.toContain("mybday.lol");
  });

  it("links famous people to Wikidata in the structured data", () => {
    const ld = dateJsonLd({ month: 10, day: 7 }, "t", "d", [
      { name: "Simon Cowell", knownFor: "TV judge", birthDate: "1959-10-07", source: "wikidata", sourceId: "Q162629" },
    ]);
    const [crumbs, page] = ld["@graph"] as unknown as [Record<string, unknown>, Record<string, unknown>];
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    expect((crumbs.itemListElement as Array<{ name: string }>).map((i) => i.name)).toEqual([
      "Home",
      "October birthdays",
      "October 7 birthdays",
    ]);
    expect(page["@type"]).toBe("WebPage");
    expect(JSON.stringify(page)).toContain("https://www.wikidata.org/wiki/Q162629");
  });
});

describe("month pages", () => {
  it("titles fit in 60 characters and descriptions in 120–160, all unique", () => {
    const descriptions = Array.from({ length: 12 }, (_, i) => {
      expect(monthTitle(i + 1).length).toBeLessThanOrEqual(60);
      return [monthDescription(i + 1, 0, DAYS_IN_MONTH[i]!), monthDescription(i + 1, 12, DAYS_IN_MONTH[i]!)];
    }).flat();
    for (const d of descriptions) expect(inRange(d), `${d.length}: ${d}`).toBe(true);
    expect(new Set(descriptions).size).toBe(24);
  });

  it("lists every date of the month in the structured data", () => {
    const days = Array.from({ length: 31 }, (_, i) => ({ month: 10, day: i + 1 }));
    const ld = monthJsonLd(10, "t", "d", days);
    const page = ld["@graph"][1] as { "@type": string; mainEntity: { numberOfItems: number } };
    expect(page["@type"]).toBe("CollectionPage");
    expect(page.mainEntity.numberOfItems).toBe(31);
  });
});

describe("page metadata", () => {
  it("sets canonical, Open Graph and a large Twitter card", () => {
    const m = pageMetadata({ title: "T", description: "D", path: "/october" });
    expect(m.alternates?.canonical).toBe("/october");
    expect(m.openGraph).toMatchObject({ title: "T", description: "D", url: "/october", siteName: "mybday.lol" });
    expect(m.twitter).toMatchObject({ card: "summary_large_image" });
  });
});

describe("fixed pages", () => {
  it("homepage descriptions fit 120–160 with or without a leader", () => {
    const today = { month: 9, day: 30 };
    expect(inRange(homeDescription(today, { name: "Maximiliana Featherstonehaugh", totalCents: 1234500 }))).toBe(true);
    expect(inRange(homeDescription(today, null))).toBe(true);
  });

  it("How it works, Terms and Privacy descriptions fit 120–160", () => {
    for (const d of [HOW_DESCRIPTION, TERMS_DESCRIPTION, PRIVACY_DESCRIPTION]) expect(inRange(d), `${d.length}`).toBe(true);
  });
});
