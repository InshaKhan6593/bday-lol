# /seo programmatic: the 366 date pages (sample: /october-7)

**Run:** 2026-10-11, claude-seo v2.4.0 `seo-programmatic` skill, production build on `http://localhost:3100`, after the
famous-people fixes and a full data refresh (7,120 people on 366 dates). Numbers come from `audit.py` (all 366 pages),
the plugin's `parse_html.py`, `content_quality.py` and `metadata_template.py`, and the audit's content and sitemap agents.

## Programmatic SEO Score: 83/100

| Category | Status | Score |
|---|---|---|
| Data Quality | ✅ | 90 |
| Template Uniqueness | ⚠️ | 62 |
| URL Structure | ✅ | 96 |
| Internal Linking | ✅ | 95 |
| Thin Content Risk | ⚠️ | 68 |
| Index Management | ✅ | 92 |

## Quality gates

| Gate | Threshold | This site | Result |
|---|---|---|---|
| Pages without content review | warning at 100+ | 366 date + 12 month pages | ⚠️ Review done: facts checked by script on all 366 pages (0 errors), 50 Wikidata people sampled (50/50 correct) |
| Pages without justification | hard stop at 500+ | 378 | ✅ under the stop |
| Unique content per page, strict (3-word sequences vs every other page) | warning <40%, suggested stop <30% | 37.2% average, lowest 34% | ⚠️ under the warning, above the stop (known, 07 D9) |
| Unique content per page vs its closest other page ("between any two pages") | ≥30–40% | 52% average, 48% worst (measured before the data refresh) | ✅ |
| Word count per page | <300 flagged | 323–338 words of main content | ✅ just above |
| Templated metadata (`metadata_template.py`, 382 pairs) | `site_risk` high fails | low, ratio 0.0 | ✅ |

**Standalone value test:** a date page passes when it has its own board, its own famous people (15 in the structured
data, 10 listed), a cited commonness rank and a facts paragraph. The 362 unclaimed pages lean entirely on the last three.

## Data source

- **Boards** (Postgres): live and unique per date, but empty on most dates until launch traffic arrives.
- **Famous people** (Wikidata + Wikipedia pageviews): 7,120 people, every date has a full list. Fixed during this audit:
  adult performers (37 → 0), people stored on two dates (27 → 0), "footballer" labels (664 → 0), cut-off labels (2 → 0).
  January 1 used to time out and keep stale data; its query now finishes in about 35 s.
- **Commonness** (FiveThirtyEight US births): one rank per date, cited on the page. The site's best unique fact.
- **Freshness:** famous people refresh monthly (one month a day on days 1–12). A bulk refresh re-stamps `lastmod` on
  every date even when a list didn't change.

## Findings

### Critical

None.

### High

1. **Strict uniqueness is 37%.** The mockup's board copy repeats on all 366 pages. The best lever is date-specific
   content the page doesn't have yet: holidays and observances (`/december-25` never says Christmas, `/july-4` never
   says Independence Day), then a sentence with the sign, birthstone and flower. Needs the client's OK (07 D9).
2. **Progressive rollout.** The skill says to publish 50–100 generated pages at a time and watch indexing. All 378 go
   live at once here. That's acceptable for a new domain with a complete sitemap, but watch Search Console for
   "Crawled – currently not indexed" on date pages in the first 2–4 weeks.

### Medium

3. **"Age 48" is the age at the board's next date,** so it reads as wrong today on almost every page. Label it
   "Turns 48" (client's mockup copy, 07 D12).
4. **The famous list is the third block** on a date page, after the bid card and the About facts. On unclaimed boards
   the H1 "Everyone celebrating October 7" is followed by nobody. Suggest showing 3–5 names under the H1 (client).
5. **No caching:** every date page is `Cache-Control: private, no-cache, no-store`. 378 pages rendered per crawl.

### Low

6. `lastmod` should move only when a date's list or board actually changes.
7. No `dateModified` in the WebPage JSON-LD and no visible "updated" line.
8. Related links are neighbours only (previous/next date, the month). Linking "same sign" or "same rank band" dates
   would add cross-links that mean something.

## What already passes

- URL pattern `/{month}-{day}`: lowercase, hyphenated, under 30 characters, no parameters, `/oct-7` redirects in one hop.
- Hub and spoke: 12 month hubs link every date; every page links all 12 hubs; every date is 3 clicks from anywhere.
- Self-referencing canonicals on all 378; personal links canonicalize to their date and stay out of the sitemap.
- Sitemap: exactly 382 URLs, all 200, none noindex, declared in robots.txt.
- Impossible dates answer a real 404.
