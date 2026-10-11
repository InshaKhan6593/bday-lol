# Sitemap findings: http://localhost:3100/sitemap.xml (2026-10-10)

Method: `sitemap_discovery.py` (plugin, with CLAUDE_SEO_LOCAL_TARGETS), then curl plus a Python script that fetched all 382 sitemap URLs with redirects disabled and parsed status, canonical, meta robots, X-Robots-Tag and title. Source read: `web/src/app/sitemap.ts` (read-only).

## Validation report

| Check | Result | Evidence |
|---|---|---|
| Discovery | PASS | robots.txt declares `Sitemap: http://localhost:3100/sitemap.xml`; plugin: found, status 200, kind urlset, valid. `sitemap_index.xml`, `sitemap-index.xml` and `wp-sitemap.xml` return 404 (no index, none needed). |
| XML validity | PASS | Parses cleanly; `urlset` namespace `http://www.sitemaps.org/schemas/sitemap/0.9`; `content-type: application/xml`; UTF-8 declaration. |
| Size limits | PASS | 382 URLs (limit 50,000); 38,212 bytes (limit 50 MB). No news: or other extension tags. |
| URL count vs expected | PASS | 382 = home + how-it-works + terms + privacy + 12 months + 366 dates. Set comparison against generated expectations (including `/february-29`): 0 missing, 0 extra, 0 duplicates. |
| Status codes | PASS | 382 of 382 return 200 on a direct request. No redirects, 404s or 5xx. |
| Canonicals | PASS | 381 of 382 have exactly one canonical equal to their own sitemap `<loc>`. The one textual difference is the homepage (see Info 1). |
| Noindex or blocked URLs in sitemap | PASS | 0 of 382 have a robots meta tag or X-Robots-Tag. `/claim` (noindex, follow), `/claim/success` and `/unsubscribe` (noindex, nofollow) are not in the sitemap. |
| Personal links excluded | PASS | No sitemap URL has a second path segment. A request to a nonexistent `/october-10/<slug>` redirects (307) to `/october-10`, whose canonical is the date page. |
| Deprecated tags | PASS | Only `<loc>` and `<lastmod>`. No `priority` or `changefreq`. |
| URL hygiene | PASS | No trailing slashes, queries or uppercase. `/october-10/` redirects (308) to `/october-10`, consistent with the sitemap form. `/february-30` returns 404, as expected. |
| lastmod format | PASS | All 382 have lastmod, ISO 8601 with milliseconds and Z, e.g. `2026-10-10T10:05:09.160Z`, valid W3C Datetime. |
| lastmod quality | PASS, with caveats | See Low 1 and Low 2. |
| Titles unique | PASS | 0 duplicate `<title>` values across the 382 pages (relevant to the doorway check). |
| robots.txt reference | PASS | Sitemap line present and correct. robots.txt disallows `/api/`, `/admin`, `/dev/`, `/styleguide`; none of those are in the sitemap. |
| Cache headers | Info | `cache-control: public, max-age=0, must-revalidate`; `dynamic = "force-dynamic"`, so every crawler hit queries the DB. Fine at this size. |

Missing pages (in the expected set but not in the sitemap): none. Extra pages (in the sitemap but non-200, redirected or noindex): none.

## lastmod analysis
- 14 distinct values, all dated 2026-10-10. Home: `10:05:01Z`. how-it-works, terms and privacy: `T00:00:00.000Z` (the `CONTENT_UPDATED` floor).
- Date and month pages share one timestamp per month (32, 32, 32, 31, ... URLs per value): the time the famous-people refresh finished that month, from `latest(CONTENT_UPDATED, boards[key], famous[key])` in `sitemap.ts`. That matches "lastmod reflects actual data update"; it is not a per-request `new Date()`.
- Month pages use the max over their dates, which is correct.

## Quality gates for programmatic pages (366 date pages)
- Plugin thresholds: WARNING at 30+ location-style pages (60%+ unique content per page); HARD STOP at 50+ (explicit user justification).
- Applicability: these are date boards, not city/location pages, so the doorway pattern "only the city swapped" does not apply literally. The count (366) is far over both thresholds, so the gate's intent applies and the justification must be explicit. It does not block the work, because the client has already decided this (D9-D14, per the brief).
- Justification that holds up:
  1. Each page is a different real entity (a calendar date) with its own live data: its own ranked board, bids and prices, and its own Wikidata famous people (7,122 across the 366 dates), plus a unique facts paragraph and fact cards. That resembles the "Safe at Scale" category (unique data per page), not templated filler.
  2. 0 duplicate titles in 382 pages. Pages are 45-101 KB of server-rendered HTML.
  3. Pages are internally linked (month hub links, previous and next date such as `/october-9` and `/october-11` from `/october-10`).
- Residual risk (known and decided, reported as context): date pages are about 37% unique on a strict 3-word comparison, below the 60% gate and below the plugin's 40% warning line, because the client's board copy repeats on all 366 pages. Trimming reached 39% but dropped pages under 300 words. This is the main doorway-page exposure of the site. Mitigation is more date-specific data (board history, per-date events) rather than fewer pages; do not shrink the sitemap, since every page carries distinct data. After launch, watch Search Console for "Crawled - currently not indexed" on date pages.

## Findings

### Info 1: homepage canonical omits the trailing slash while the sitemap has it
- Evidence: `<link rel="canonical" href="http://localhost:3100"/>` versus sitemap `<loc>http://localhost:3100/</loc>`. These are the same URL (an empty path normalizes to `/`), so this is not a defect.
- Fix (optional): none needed. Emit `${origin}/` in both places only for a literal string match with strict third-party validators.

### Low 1: all lastmod values fall on one day and cluster by month
- Evidence: 382 of 382 on 2026-10-10; 14 distinct timestamps, 12 of which are the month-by-month famous refresh finish times.
- Impact: honest today, because the data really was refreshed that day. After launch, Google can learn to distrust lastmod if a bulk job re-stamps pages that did not materially change. The plugin check "all identical lastmod" is only partially tripped (same day, not same time).
- Fix: when the famous refresh re-runs, update the per-date refreshed-at only for dates whose people list actually changed (compare a hash before writing). Keep claims and boosts as the main drivers.

### Low 2: legal and how-it-works pages use a midnight floor
- Evidence: `how-it-works`, `terms` and `privacy` are `2026-10-10T00:00:00.000Z`, the `CONTENT_UPDATED` constant. Not wrong, but a midnight value looks synthetic.
- Fix: none required. Bump `CONTENT_UPDATED` (or the page's own updated-at) to the real edit time only on significant edits.

### Info 2: noindex utility pages are crawlable by design
- Evidence: `/claim`, `/claim/success` and `/unsubscribe` are not disallowed in robots.txt and carry a robots meta of noindex. That is the correct pattern (a robots.txt Disallow would stop Google from seeing the noindex). They are absent from the sitemap.
- Fix: none.

### Info 3: localhost origin in sitemap
- Evidence: every `<loc>` starts with `http://localhost:3100`. Expected for this pre-launch build.
- Fix: before launch, verify the production build uses the final https origin in the sitemap, canonicals and the robots.txt Sitemap line, then submit the sitemap in Search Console.

## What works
- 382 of 382 URLs are 200, self-canonical and indexable. Exact match to the expected set, no extras, no duplicates.
- Clean format: no deprecated tags, valid W3C lastmod on every entry, far under both file limits.
- lastmod is derived from real data changes (board activity, famous refresh, content version), not request time.
- Noindex and canonical-elsewhere pages (claim, success, unsubscribe, personal links) are correctly excluded; robots.txt references the sitemap and blocks none of its URLs.

## Category score: 94/100
Deductions: -3 lastmod granularity and re-stamping risk after launch (Low 1), -2 midnight floor on the static pages (Low 2), -1 the structural doorway exposure of the 366 date pages (known, 37% unique), which belongs to the content category but is relevant to the gate.
