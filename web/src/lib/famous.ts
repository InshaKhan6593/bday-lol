/**
 * Choosing the famous people for "Famous people born on [date]" (06-seo.md §2).
 * Pure rules, kept apart from the network so they can be tested: which
 * occupations count as entertainment, who is left out, how they're ranked and
 * how "what they're known for" is written.
 */

/** Wikidata occupation classes that count as entertainment (each one includes its subclasses). */
export const ENTERTAINMENT_ROOTS: Record<string, string> = {
  Q33999: "actor",
  Q639669: "musician",
  Q177220: "singer",
  Q36834: "composer",
  Q50995749: "athlete",
  Q2066131: "athlete",
  Q947873: "TV host",
  Q13590141: "presenter",
  Q17125263: "YouTuber",
  Q2045208: "internet personality",
  Q57414145: "streamer",
  Q15077007: "podcaster",
  Q245068: "comedian",
  Q4610556: "model",
  Q5716684: "dancer",
  Q2526255: "film director",
  Q2252262: "rapper",
  Q130857: "DJ",
};

/**
 * Left out even if they're also actors or musicians: politicians (07 A4: entertainment only) and
 * adult performers (a birthday site for everyone; 30 date pages listed one before this filter).
 */
export const EXCLUDED_ROOTS: Record<string, string> = {
  Q82955: "politician",
  Q488111: "pornographic film actor",
  Q17456089: "pornographic film director",
  Q3286043: "erotic photography model",
  Q8193763: "fetish model",
};

/** Listed in full under "Famous people born on…" (06-seo.md: top 10); the rest of the stored ones go in an "Also born on…" line. */
export const FAMOUS_LISTED = 10;
/** How many we keep per date: 10 listed, 5 more named, and 5 spares that move up when the admin hides someone. */
export const FAMOUS_KEEP = 20;
/** How many of the most-linked candidates per date get a pageviews lookup. */
export const PAGEVIEW_CANDIDATES = 30;

export type FamousCandidate = {
  /** Wikidata id, "Q12345". */
  sourceId: string;
  /** "1969-10-07" */
  birthDate: string;
  /** Number of Wikipedia language editions: a cheap first filter before pageviews. */
  sitelinks: number;
  /** English Wikipedia article title, "Simon_Cowell". */
  article: string;
  occupations: string[];
};

export type FamousRecord = {
  sourceId: string;
  name: string;
  knownFor: string;
  birthDate: string;
  pageviews: number;
  rank: number;
};

/**
 * Splits occupations into entertainment and excluded using each occupation's
 * root classes (from the subclass lookup). Someone qualifies with at least one
 * entertainment occupation and no excluded one.
 */
export function qualifies(occupations: string[], rootsOf: Map<string, Set<string>>): boolean {
  let entertainment = false;
  for (const occ of occupations) {
    const roots = rootsOf.get(occ) ?? new Set([occ]);
    for (const root of roots) {
      if (root in EXCLUDED_ROOTS) return false;
      if (root in ENTERTAINMENT_ROOTS) entertainment = true;
    }
  }
  return entertainment;
}

/** The plain label of someone's first entertainment occupation, the fallback for "known for". */
export function occupationLabel(occupations: string[], rootsOf: Map<string, Set<string>>): string {
  for (const occ of occupations) {
    for (const root of rootsOf.get(occ) ?? [occ]) {
      if (root in ENTERTAINMENT_ROOTS) return ENTERTAINMENT_ROOTS[root]!;
    }
  }
  return "entertainer";
}

/**
 * ", American singer" style label from the Wikidata description: parentheses
 * (birth years, disambiguation) dropped, first clause only, "association
 * football" said the US way, and short enough to sit on one row next to the
 * name ("English musician and lead vocalist of Radiohead" → "English musician").
 * Missing or still too long → the occupation label.
 */
export function knownFor(description: string | undefined, fallback: string): string {
  let clean = soccerTheUsWay(
    (description ?? "")
      .replace(/\s*\([^)]*\)/g, "")
      .split(/[;,]| who | known for /)[0]!,
  ).trim();
  // "middle- and long-distance runner" → "middle-distance runner", so the cut below can't leave "middle-".
  if (clean.length > 40) clean = clean.replace(/\b(\w+)- and \w+-(\w+)\b/g, "$1-$2");
  if (clean.length > 40) clean = clean.split(" and ")[0]!.trim();
  if (!clean || clean.length > 40 || clean.endsWith("-") || /\b(1[89]|20)\d\d\b/.test(clean)) return fallback;
  return clean;
}

/** Football codes that aren't soccer; their wording is left alone. */
const OTHER_FOOTBALL = /\b(American|Canadian|Australian rules|Gaelic|rugby(?: league| union)?|arena|flag) football/i;

/**
 * The site is American English: "association football", "footballer" and a bare
 * "football" all mean soccer in Wikidata's English descriptions ("Spanish footballer"
 * → "Spanish soccer player", "French football manager" → "French soccer manager").
 */
export function soccerTheUsWay(text: string): string {
  if (OTHER_FOOTBALL.test(text)) return text;
  return text
    .replace(/\bassociation football(er| player)\b/g, "soccer player")
    .replace(/\bfootballer\b/g, "soccer player")
    .replace(/\b(association )?football\b/g, "soccer");
}

/** Best known first: most Wikipedia pageviews, then most language editions, then id for a stable order. */
export function rankFamous<T extends { pageviews: number; sitelinks: number; sourceId: string }>(people: T[]): T[] {
  return [...people].sort(
    (a, b) => b.pageviews - a.pageviews || b.sitelinks - a.sitelinks || a.sourceId.localeCompare(b.sourceId),
  );
}

/**
 * One row per person. Someone whose sources disagree on the birth date (two
 * equally ranked dates) is left out: we'd risk listing them on the wrong day
 * or with the wrong age.
 */
export function oneBirthDateEach(rows: FamousCandidate[]): FamousCandidate[] {
  const dates = new Map<string, Set<string>>();
  for (const r of rows) dates.set(r.sourceId, (dates.get(r.sourceId) ?? new Set()).add(r.birthDate));
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (dates.get(r.sourceId)!.size > 1 || seen.has(r.sourceId)) return false;
    seen.add(r.sourceId);
    return true;
  });
}
