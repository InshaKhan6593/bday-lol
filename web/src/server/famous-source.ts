import { DAYS_IN_MONTH, occursIn, toKey, type MonthDay } from "@/lib/birthday";
import {
  ENTERTAINMENT_ROOTS,
  EXCLUDED_ROOTS,
  FAMOUS_KEEP,
  knownFor,
  occupationLabel,
  oneBirthDateEach,
  PAGEVIEW_CANDIDATES,
  qualifies,
  rankFamous,
  type FamousCandidate,
  type FamousRecord,
} from "@/lib/famous";

/**
 * Where famous birthdays come from. Wikidata + Wikipedia pageviews today; a
 * licensed Famous Birthdays feed can replace it later by implementing this (06-seo.md §2).
 */
export interface FamousBirthdaysProvider {
  /** Stored with each row so hidden people stay hidden across refreshes of the same source. */
  readonly source: string;
  /** Ranked people per date in a month, keyed "10-07". Dates that couldn't be fetched are left out. */
  fetchMonth(month: number, instant: Date): Promise<Map<string, FamousRecord[]>>;
}

const SPARQL = "https://query.wikidata.org/sparql";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const PAGEVIEWS = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user";

/** Wikimedia asks every client to identify itself with a contact (meta.wikimedia.org/wiki/User-Agent_policy). */
function userAgent(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mybday.lol";
  const contact = process.env.EMAIL_REPLY_TO ?? "mybdaylol@gmail.com";
  return `mybday.lol famous-birthdays/1.0 (${site}; ${contact})`;
}

async function getJson<T>(url: string, init: RequestInit = {}, attempts = 5): Promise<T> {
  for (let i = 1; ; i++) {
    let retryable = true;
    let message: string;
    let waitMs = 2000 * 2 ** (i - 1);
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "User-Agent": userAgent(), ...init.headers },
        signal: AbortSignal.timeout(70_000),
      });
      if (res.ok) return (await res.json()) as T;
      // 429/5xx: the service is busy. Other 4xx won't get better by asking again.
      retryable = res.status >= 500 || res.status === 429;
      message = `HTTP ${res.status}`;
      // Rate limited: wait as long as Wikimedia asks (Retry-After, in seconds), up to a minute.
      const retryAfter = Number(res.headers.get("retry-after"));
      if (res.status === 429) waitMs = Math.min(60_000, retryAfter > 0 ? retryAfter * 1000 : 10_000 * i);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error); // network error or timeout
    }
    if (!retryable || i >= attempts) throw new Error(`${new URL(url).host}: ${message}`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

type Bindings = { results: { bindings: Array<Record<string, { value: string }>> } };

function sparql(query: string): Promise<Bindings> {
  return getJson<Bindings>(SPARQL, {
    method: "POST",
    headers: { Accept: "application/sparql-results+json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ query }),
  });
}

const qid = (uri: string) => uri.slice(uri.lastIndexOf("/") + 1);

/** Oldest birth year we look at: anyone older is very unlikely to still be alive (and data errors cluster there). */
const FROM_YEAR = 1925;

/**
 * Living people born on one month-day, with a day-precise birth date (best
 * rank only), 15+ Wikipedia language editions and an English article.
 * The birth dates are listed exactly (one per year) so the query service can
 * use its index; filtering every birth date by MONTH() times out (504).
 */
async function candidatesFor(md: MonthDay, lastYear: number): Promise<FamousCandidate[]> {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dates: string[] = [];
  for (let y = FROM_YEAR; y <= lastYear; y++) {
    if (occursIn(md, y)) dates.push(`"${y}-${pad(md.month)}-${pad(md.day)}T00:00:00Z"^^xsd:dateTime`);
  }
  const data = await sparql(`
    SELECT ?p ?dob ?links ?article (GROUP_CONCAT(DISTINCT ?occ; separator=" ") AS ?occs) WHERE {
      hint:Query hint:optimizer "None" .
      VALUES ?dob { ${dates.join(" ")} }
      ?p wdt:P569 ?dob .
      ?p wdt:P31 wd:Q5 .
      ?p wikibase:sitelinks ?links . FILTER(?links >= 15)
      ?p p:P569 ?born . ?born a wikibase:BestRank; psv:P569 ?value .
      ?value wikibase:timeValue ?dob; wikibase:timePrecision 11 .
      MINUS { ?p wdt:P570 [] }
      ?article schema:about ?p; schema:isPartOf <https://en.wikipedia.org/> .
      ?p wdt:P106 ?occ .
    } GROUP BY ?p ?dob ?links ?article`);
  const rows = data.results.bindings.map((b) => ({
    sourceId: qid(b.p!.value),
    birthDate: b.dob!.value.slice(0, 10),
    sitelinks: Number(b.links!.value),
    article: b.article!.value.slice(b.article!.value.indexOf("/wiki/") + 6),
    occupations: b.occs!.value.split(" ").map(qid),
  }));
  return oneBirthDateEach(rows);
}

/** For each occupation, which of our root classes it falls under (walking up "subclass of"). */
async function rootsOf(occupations: string[]): Promise<Map<string, Set<string>>> {
  const roots = [...Object.keys(ENTERTAINMENT_ROOTS), ...Object.keys(EXCLUDED_ROOTS)];
  const map = new Map<string, Set<string>>(occupations.map((o) => [o, new Set<string>()]));
  for (let i = 0; i < occupations.length; i += 400) {
    const batch = occupations.slice(i, i + 400);
    const data = await sparql(`
      SELECT DISTINCT ?occ ?root WHERE {
        VALUES ?occ { ${batch.map((o) => `wd:${o}`).join(" ")} }
        VALUES ?root { ${roots.map((r) => `wd:${r}`).join(" ")} }
        ?occ wdt:P279* ?root .
      }`);
    for (const b of data.results.bindings) map.get(qid(b.occ!.value))?.add(qid(b.root!.value));
  }
  return map;
}

/** Views of the English Wikipedia article over the last two full months. */
async function pageviews(article: string, instant: Date): Promise<number> {
  const end = new Date(Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), 0));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  try {
    const data = await getJson<{ items: Array<{ views: number }> }>(
      `${PAGEVIEWS}/${article}/monthly/${fmt(start)}/${fmt(end)}`,
    );
    return data.items.reduce((sum, item) => sum + item.views, 0);
  } catch {
    return 0; // a renamed or brand-new article: rank it on language editions alone
  }
}

/** English names and descriptions, 50 ids per call (the API's limit). */
async function labels(
  ids: string[],
): Promise<{ found: Map<string, { name?: string; description?: string }>; failed: Set<string> }> {
  const out = new Map<string, { name?: string; description?: string }>();
  const failed = new Set<string>();
  for (let i = 0; i < ids.length; i += 50) {
    const params = new URLSearchParams({
      action: "wbgetentities",
      ids: ids.slice(i, i + 50).join("|"),
      props: "labels|descriptions",
      languages: "en",
      format: "json",
    });
    try {
      const data = await getJson<{
        entities: Record<string, { labels?: { en?: { value: string } }; descriptions?: { en?: { value: string } } }>;
      }>(`${WIKIDATA_API}?${params}`);
      for (const [id, e] of Object.entries(data.entities)) {
        out.set(id, { name: e.labels?.en?.value, description: e.descriptions?.en?.value });
      }
    } catch (error) {
      // Their dates are left out of this refresh (keeping last month's list); the rest still lands.
      for (const id of ids.slice(i, i + 50)) failed.add(id);
      console.error("famous: labels batch skipped:", error instanceof Error ? error.message : error);
    }
  }
  return { found: out, failed };
}

/** Runs `fn` over `items` with at most `limit` in flight (polite to Wikimedia's APIs). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

export const wikidataProvider: FamousBirthdaysProvider = {
  source: "wikidata",
  async fetchMonth(month, instant) {
    // One query per day, three at a time (the query service allows five per client).
    // A day that keeps failing is left out of the result, so its stored list stays as it was.
    const days = Array.from({ length: DAYS_IN_MONTH[month - 1]! }, (_, i) => ({ month, day: i + 1 }));
    // Nobody under 10: a famous birthday list is about people the visitor would know.
    const lastYear = instant.getUTCFullYear() - 10;
    const perDay = await mapLimit(days, 3, async (md) => {
      try {
        return { key: toKey(md), list: await candidatesFor(md, lastYear) };
      } catch (error) {
        console.error(`famous: ${toKey(md)} skipped:`, error instanceof Error ? error.message : error);
        return null;
      }
    });
    const fetched = perDay.filter((d) => d !== null);
    const all = fetched.flatMap((d) => d.list);
    const roots = await rootsOf([...new Set(all.flatMap((c) => c.occupations))]);

    // Pageviews only for each day's most-linked qualifying candidates: the rest can't make the top 10.
    const shortlist = new Map(
      fetched.map(({ key, list }) => [
        key,
        list
          .filter((c) => qualifies(c.occupations, roots))
          .sort((a, b) => b.sitelinks - a.sitelinks)
          .slice(0, PAGEVIEW_CANDIDATES),
      ]),
    );
    const flat = [...shortlist.values()].flat();
    const views = await mapLimit(flat, 8, (c) => pageviews(c.article, instant));
    const viewsOf = new Map(flat.map((c, i) => [c.sourceId, views[i]!]));

    const ranked = new Map(
      [...shortlist].map(([key, list]) => [
        key,
        rankFamous(list.map((c) => ({ ...c, pageviews: viewsOf.get(c.sourceId)! }))).slice(0, FAMOUS_KEEP),
      ]),
    );
    const { found: names, failed } = await labels([...ranked.values()].flatMap((list) => list.map((c) => c.sourceId)));

    const result = new Map<string, FamousRecord[]>();
    for (const [key, list] of ranked) {
      if (list.some((c) => failed.has(c.sourceId))) continue;
      const records = list
        .filter((c) => names.get(c.sourceId)?.name)
        .map((c, i) => ({
          sourceId: c.sourceId,
          name: names.get(c.sourceId)!.name!,
          knownFor: knownFor(names.get(c.sourceId)!.description, occupationLabel(c.occupations, roots)),
          birthDate: c.birthDate,
          pageviews: c.pageviews,
          rank: i + 1,
        }));
      result.set(key, records);
    }
    return result;
  },
};
