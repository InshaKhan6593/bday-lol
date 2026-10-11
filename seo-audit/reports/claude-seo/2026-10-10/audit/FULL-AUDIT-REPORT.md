# Full SEO audit: mybday.lol (claude-seo plugin v2.4.0)

**Date:** 2026-10-10 · **Target:** production build on `http://localhost:3100` (not launched yet) · **Data:** seed board
data on today's date, famous people from Wikidata for all 366 dates · **Method:** `/seo audit`, run as the plugin's
orchestrator with its 9 core sub-agents (technical, content, schema, sitemap, performance, visual, geo, agentic, sxo).
Google, Matomo, Moz and DataForSEO credentials aren't configured, and there's no drift baseline, so those agents were
skipped. Backlinks are meaningless for an unlaunched local site.

**Business type:** consumer web app with paid listings (a birthday leaderboard): not local, not e-commerce, no blog.

## SEO Health Score: 80 / 100 (at audit time)

| Category | Weight | Score | Source |
|---|---|---|---|
| Technical SEO | 22% | 84 | [findings/technical.md](findings/technical.md) |
| Content Quality | 23% | 68 | [findings/content.md](findings/content.md) |
| On-Page SEO | 20% | 88 | technical + content + sitemap findings (titles 45–58 chars, descriptions 123–159, one H1, self canonicals, every date 3 clicks deep) |
| Schema / Structured Data | 10% | 84 | [findings/schema.md](findings/schema.md) |
| Performance (CWV, lab only) | 10% | 84 | [findings/performance.md](findings/performance.md) |
| AI Search Readiness | 10% | 76 | GEO 62 ([findings/geo.md](findings/geo.md)) and agent readiness 90 ([findings/agentic.md](findings/agentic.md)), averaged |
| Images | 5% | 85 | no content images (nothing to fail); share images on every page except Terms/Privacy |

Supporting scores (not in the weighted total): sitemap 94 ([findings/sitemap.md](findings/sitemap.md)), visual 82
([findings/visual.md](findings/visual.md), raw HTML only: the plugin's browser refuses localhost), search experience
(SXO) 58 ([findings/sxo.md](findings/sxo.md)).

## Fixed during the audit (verified)

Five findings were real bugs in the famous-people data or copy, so they were fixed in code (with tests) and the data
was refreshed for all 366 dates. Numbers are from the database before → after.

| # | Finding (agents that reported it) | Fix | Before → after |
|---|---|---|---|
| 1 | Adult performers listed on 30 date pages (content) | Exclude Wikidata occupations pornographic film actor / director, erotic photography model, fetish model (`lib/famous.ts`) | 37 → 0 people |
| 2 | People on two dates with conflicting birth dates, e.g. Jane Seymour on Feb 15 and May 13 (schema) | Drop anyone with two equally ranked day-precise birth dates, checked for each date's shortlist (`server/famous-source.ts`) | 27 → 0 people |
| 3 | "footballer" next to "soccer player" on 221 pages (technical, schema, geo, sxo, content) | "footballer" / "football manager" → "soccer …", other codes (American, Australian rules, Gaelic, rugby) left alone (`lib/famous.ts`) | 664 → 0 labels |
| 4 | "Norwegian middle-" cut-off labels (content) | "middle- and long-distance" → "middle-distance"; a label never ends in "-" | 2 → 0 |
| 5 | February says its rarest date is Feb 13, while the grid and /february-29 say Feb 29 (content) | Intro and meta description name Feb 29, then the rarest of the other dates (`lib/about.ts`, `lib/seo.ts`) | fixed |

Found while refreshing: **January 1 never refreshed** when Wikidata was busy. Year-only birth dates are stored as
"January 1", so the query matched every year-only birth and timed out. The query now starts from day-precise date values
(Jan 1: timeout → 35 s, Oct 7 unchanged at ~5 s), and a date that still times out is split into smaller year ranges.

## Top issues still open

| Priority | Issue | Why it matters | Fix | Owner |
|---|---|---|---|---|
| High | Every page is sent `Cache-Control: private, no-cache, no-store` (technical, performance) | On Vercel the CDN can't cache anything: every visit and crawl is a serverless call + Postgres queries. Also the first thing to break under load | Static/ISR for How it works, Terms, Privacy, month pages; short revalidate (60–300 s) + `revalidateTag` from the Stripe webhook for date pages and home | us, step 11 |
| High | No page answers "famous birthdays today" (sxo) | The homepage has no famous people; that query's results are all lists titled with today's date | A "Famous birthdays today" strip on the homepage | client (design) |
| Medium | "Age 48" is the age at the board's next date, read as wrong today (content, geo, sxo) | Simon Cowell shows 68 but is 67; Feb 29 shows 2 years ahead | Label "Turns 48" (or show today's age) | client (mockup copy, 07 D12) |
| Medium | 404 pages have an empty server-rendered body (technical) | No message, links or `lang` without JavaScript | Server-rendered `app/not-found.tsx` | us |
| Medium | Legal pages show "[Launch date]" and "[If required: … Article 27 GDPR.]" (content) | Placeholder text visible on public pages | Client fills them in (or the admin edits them, step 10) | client |
| Medium | No holiday/date context: /december-25 never says Christmas, /july-4 never says Independence Day (content) | Best way to raise the 37% uniqueness and match searches | A small holidays table feeding the About paragraph | us (with client OK, 07 D9) |
| Medium | Sign, birthstone and flower only in fact cards, not in a sentence (geo) | Text extractors and AI answers drop them | One sentence in the About paragraph | us |
| Medium | ~240 KB gzipped JS/CSS on every page; Radix UI on content-only pages (technical, performance) | Simulated mobile LCP 2.9–3.0 s (limit 2.5 s); Lighthouse 94–95 | Lazy-load Boost/Share/Gift menus and the date picker | us |
| Low | No `llms.txt`, no Content-Signal line (agentic, geo) | Optional; would make Lighthouse Agentic 3/3 | Add at launch; `ai-train` value is the client's call (07 D14) | us + client |
| Low | No `dateModified` / visible "updated" (geo, schema, sxo) | Freshness signal; extractors guessed 2026-01-01 | Reuse the sitemap's lastmod in JSON-LD | us |
| Low | Terms/Privacy have no share image; `X-Powered-By` header; homepage WebSite description changes daily; Organization schema thin | Small polish | See findings files | us |
| Low | `/_icon-options.html` is served (geo) | Local comparison page, git-excluded | Delete once the share-icon decision is made | us |

Known and decided, reported as context only: date pages ~37% unique on a strict 3-word comparison (52% against each
page's closest match, all above the 40% warning), homepage ~204 words (mockup copy), FAQPage on How it works, no
HTTPS/CWV/Search Console data locally, no brand suffix in titles, all AI crawlers allowed.

## What works

- Every page is fully server-rendered: crawlers and AI agents get the whole text without JavaScript.
- Sitemap: exactly the 382 expected URLs, all 200, all self-canonical, no noindex pages, honest lastmod.
- 366 date pages each have a BreadcrumbList and a WebPage with 15 Person nodes linked to Wikidata (50/50 sample correct).
- Titles and descriptions are unique and in range on all 382 pages; templated-metadata risk "low", ratio 0.0.
- Facts checked by script on all 366 pages (sign, weekday, day of year, half birthday): 0 errors.
- CLS 0 everywhere; no third-party scripts; contrast ≥ 6.8:1; Lighthouse Agentic Browsing 2/2.
- The commonness fact (FiveThirtyEight, cited) is the site's strongest search advantage: "how common is my birthday"
  has no exact answer in today's results.

## Limits of this run

Local only: no HTTPS, CDN, field Core Web Vitals, Search Console or backlink data. The plugin's headless browser refuses
localhost, so no screenshots and no rendered above-the-fold checks (Lighthouse ran locally instead). SERP checks used a
search tool, not a live Google results page. Re-run `/seo audit https://mybday.lol` after launch.

## Files

- [ACTION-PLAN.md](ACTION-PLAN.md): the open items, in order
- [SEO-Report-mybday.lol.pdf](SEO-Report-mybday.lol.pdf): the plugin's report (its HTML printed to PDF with the plugin's
  Chromium, because WeasyPrint's system libraries aren't installed on this Windows machine)
- [audit-data.json](audit-data.json): structured envelope the report is generated from
- `findings/*.md`: one file per sub-agent. `/seo technical`, `/seo schema`, `/seo sitemap` and `/seo geo` from the
  handoff are these agents' files (schema and sitemap covered all 382 URLs, GEO used `/october-7`)
- [../programmatic-october-7.md](../programmatic-october-7.md), [../page-october-7.md](../page-october-7.md),
  [../page-october.md](../page-october.md): the programmatic and single-page commands, run on 2026-10-11 after the fixes

## Comparable score (`audit.py`)

Re-run on 2026-10-11 after the fixes and the data refresh: **97/100**, the same as after step 9
([reports/COMPARISON-next.md](../../../COMPARISON-next.md)). The same 2 of 44 checks fail, both known and decided: date
pages 37% unique on the strict measure, and the homepage's 204 words.
