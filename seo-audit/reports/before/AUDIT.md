# SEO audit: mybday.lol (before)

Run 2026-10-10T07:46:15+00:00 against `http://localhost:3000` with claude-seo 2.4.2 analysers. 387 URLs fetched.

## Overall score: 46/100

```
Crawlability      23/100  ██░░░░░░░░
Indexability      70/100  ███████░░░
On-page           82/100  ████████░░
Content            7/100  █░░░░░░░░░
Structured data   75/100  ████████░░
Sharing            0/100  ░░░░░░░░░░
Security           0/100  ░░░░░░░░░░
```

## Failing checks

### Critical

- **Every public page (366 dates, 12 months, home, FAQ, legal) answers 200** (Crawlability; 370/382 pass). E.g. `/april → 404`, `/august → 404`, `/december → 404`, `/february → 404`, `/january → 404`, `/july → 404` _Source: seo-technical §1_
- **Date pages are ≥40% unique (average 17%, measured on 3-word sequences in the main content)** (Content; 3/366 pass). E.g. `/april-1 (16%)`, `/april-10 (16%)`, `/april-11 (16%)`, `/april-12 (16%)`, `/april-13 (16%)`, `/april-14 (16%)` _Source: seo-programmatic: Thin Content Safeguards_

### High

- **robots.txt exists** (Crawlability; fail). E.g. `/robots.txt → 404` _Source: seo-technical §1_
- **sitemap.xml exists and parses** (Crawlability; fail). E.g. `/sitemap.xml → 404` _Source: seo-sitemap_
- **Sitemap lists home, FAQ, all 366 dates and all 12 months** (Crawlability; 0/380 pass). E.g. `/`, `/april`, `/april-1`, `/april-10`, `/april-11`, `/april-12` _Source: seo-programmatic: Sitemap_
- **Each month page (hub) links to every date in it** (Crawlability; 0/12 pass). E.g. `/april (status 404)`, `/august (status 404)`, `/december (status 404)`, `/february (status 404)`, `/january (status 404)`, `/july (status 404)` _Source: seo-programmatic: Internal Linking (hub/spoke)_
- **Every date and month page is within 3 clicks of the homepage** (Crawlability; 9/378 pass). E.g. `/april (depth ∞)`, `/april-1 (depth 171)`, `/april-10 (depth 180)`, `/april-11 (depth 181)`, `/april-12 (depth 182)`, `/april-13 (depth 181)` _Source: seo-technical §1 (crawl depth)_
- **No internal link leads to an error page** (Crawlability; 371/383 pass). E.g. `/april → 404`, `/august → 404`, `/december → 404`, `/february → 404`, `/january → 404`, `/july → 404` _Source: seo-page: Internal links_
- **Every public page has an absolute, self-referencing canonical** (Indexability; 369/370 pass). E.g. `/ → None` _Source: seo-programmatic: Canonical Strategy_
- **Open Graph title, description, url and image on every shareable page** (Sharing; 0/368 pass). E.g. `/`, `/april-1`, `/april-10`, `/april-11`, `/april-12`, `/april-13` _Source: seo-page: Technical Elements_
- **Share images load (sampled: home, 3 dates, a month, FAQ, a personal link)** (Sharing; 0/7 pass). E.g. `/ (no og:image)`, `/december-25 (no og:image)`, `/february-29 (no og:image)`, `/how-it-works (no og:image)`, `/october (no og:image)`, `/october-10/jess-moreno (no og:image)` _Source: 06-seo.md (OG image per date)_

### Medium

- **robots.txt points to the sitemap** (Crawlability; fail). E.g. `no Sitemap: line` _Source: seo-programmatic: Sitemap_
- **claude-seo sitemap_discovery finds a valid sitemap** (Crawlability; fail). E.g. `robots.txt returned HTTP 404` _Source: sitemap_discovery.py_
- **Claim, checkout result and unsubscribe pages are noindex** (Indexability; 3/4 pass). E.g. `/unsubscribe` _Source: 06-seo.md + seo-technical §2_
- **Titles are 30–60 characters (Google truncates around 60)** (On-page; 0/370 pass). E.g. `/ (10)`, `/april-1 (82)`, `/april-10 (83)`, `/april-11 (83)`, `/april-12 (83)`, `/april-13 (83)` _Source: quality-gates.md_
- **Descriptions don't restate the title (metadata_template site_risk: low)** (On-page; 367/370 pass). E.g. `/how-it-works`, `/privacy`, `/terms` _Source: metadata_template.py_
- **Date and month pages have 300+ words of main content** (Content; 1/366 pass). E.g. `/april-1 (82)`, `/april-10 (82)`, `/april-11 (82)`, `/april-12 (82)`, `/april-13 (82)`, `/april-14 (82)` _Source: seo-programmatic: Quality Gates (<300 words)_
- **Home pages carry Organization + WebSite** (Structured data; 0/1 pass). E.g. `/ (has none)` _Source: seo-schema / schema-types.md_
- **Date pages carry BreadcrumbList + WebPage** (Structured data; 0/366 pass). E.g. `/april-1 (has none)`, `/april-10 (has none)`, `/april-11 (has none)`, `/april-12 (has none)`, `/april-13 (has none)`, `/april-14 (has none)` _Source: seo-schema / schema-types.md_
- **Personal links share their own card (handoff v2)** (Sharing; fail). E.g. `/october-10/jess-moreno` _Source: Handoff v2 / 06-seo.md_

### Low

- **Sitemap entries carry <lastmod>** (Crawlability; fail). E.g. `0/0 with lastmod` _Source: seo-programmatic: Sitemap_
- **Descriptions are 120–160 characters** (On-page; 346/370 pass). E.g. `/ (56)`, `/privacy (72)`, `/september-10 (162)`, `/september-11 (162)`, `/september-12 (162)`, `/september-13 (162)` _Source: quality-gates.md_
- **Homepage explains itself in 500+ words (204 now)** (Content; fail). E.g. `/ (204)` _Source: quality-gates.md (homepage)_
- **Twitter/X card is summary_large_image** (Sharing; 0/368 pass). E.g. `/`, `/april-1`, `/april-10`, `/april-11`, `/april-12`, `/april-13` _Source: seo-page: Technical Elements_
- **x-content-type-options header** (Security; fail). E.g. `missing` _Source: seo-technical §3_
- **referrer-policy header** (Security; fail). E.g. `missing` _Source: seo-technical §3_
- **Clickjacking protection (X-Frame-Options or CSP frame-ancestors)** (Security; fail). E.g. `missing` _Source: seo-technical §3_

## All checks

| | Check | Category | Severity | Result |
|---|---|---|---|---|
| ❌ | Every public page (366 dates, 12 months, home, FAQ, legal) answers 200 | Crawlability | critical | 370/382 pass |
| ❌ | robots.txt exists | Crawlability | high | fail |
| ❌ | robots.txt points to the sitemap | Crawlability | medium | fail |
| ✅ | robots.txt does not block pages that should be indexed or read | Crawlability | critical | pass |
| ❌ | sitemap.xml exists and parses | Crawlability | high | fail |
| ❌ | Sitemap lists home, FAQ, all 366 dates and all 12 months | Crawlability | high | 0/380 pass |
| ✅ | Sitemap holds no noindex, redirected or missing URLs | Crawlability | medium | pass |
| ❌ | Sitemap entries carry <lastmod> | Crawlability | low | fail |
| ❌ | claude-seo sitemap_discovery finds a valid sitemap | Crawlability | medium | fail |
| ❌ | Each month page (hub) links to every date in it | Crawlability | high | 0/12 pass |
| ❌ | Every date and month page is within 3 clicks of the homepage | Crawlability | high | 9/378 pass |
| ❌ | No internal link leads to an error page | Crawlability | high | 371/383 pass |
| ✅ | Old /oct-7 share links redirect permanently to /october-7 | Crawlability | low | pass |
| ✅ | Public pages are not noindex | Indexability | critical | 370/370 pass |
| ❌ | Claim, checkout result and unsubscribe pages are noindex | Indexability | medium | 3/4 pass |
| ❌ | Every public page has an absolute, self-referencing canonical | Indexability | high | 369/370 pass |
| ✅ | Personal links canonicalise to their date page | Indexability | medium | pass |
| ✅ | Impossible dates answer 404, not a page | Indexability | medium | 3/3 pass |
| ✅ | Pages declare a language and a mobile viewport | Indexability | medium | 370/370 pass |
| ✅ | Every page has a title | On-page | critical | 370/370 pass |
| ❌ | Titles are 30–60 characters (Google truncates around 60) | On-page | medium | 0/370 pass |
| ✅ | Titles are unique | On-page | high | 370/370 pass |
| ✅ | Every page has a meta description | On-page | high | 370/370 pass |
| ❌ | Descriptions are 120–160 characters | On-page | low | 346/370 pass |
| ✅ | Descriptions are unique | On-page | high | 370/370 pass |
| ❌ | Descriptions don't restate the title (metadata_template site_risk: low) | On-page | medium | 367/370 pass |
| ✅ | Exactly one H1 per page | On-page | high | 370/370 pass |
| ✅ | Heading levels don't skip (H2 → H4) | On-page | low | 370/370 pass |
| ❌ | Date and month pages have 300+ words of main content | Content | medium | 1/366 pass |
| ❌ | Date pages are ≥40% unique (average 17%, measured on 3-word sequences in the main content) | Content | critical | 3/366 pass |
| ✅ | content_quality.py scores 60+ on main content | Content | low | 370/370 pass |
| ❌ | Homepage explains itself in 500+ words (204 now) | Content | low | fail |
| ✅ | All JSON-LD blocks parse | Structured data | critical | 370/370 pass |
| ❌ | Home pages carry Organization + WebSite | Structured data | medium | 0/1 pass |
| ❌ | Date pages carry BreadcrumbList + WebPage | Structured data | medium | 0/366 pass |
| ✅ | Month pages carry BreadcrumbList + CollectionPage | Structured data | medium | 0/0 pass |
| ✅ | No deprecated schema types (HowTo, SpecialAnnouncement…) | Structured data | high | 370/370 pass |
| ❌ | Open Graph title, description, url and image on every shareable page | Sharing | high | 0/368 pass |
| ❌ | Twitter/X card is summary_large_image | Sharing | low | 0/368 pass |
| ❌ | Share images load (sampled: home, 3 dates, a month, FAQ, a personal link) | Sharing | high | 0/7 pass |
| ❌ | Personal links share their own card (handoff v2) | Sharing | medium | fail |
| ❌ | x-content-type-options header | Security | low | fail |
| ❌ | referrer-policy header | Security | low | fail |
| ❌ | Clickjacking protection (X-Frame-Options or CSP frame-ancestors) | Security | low | fail |

## Sample pages

### `/`

| Field | Value |
|---|---|
| status | 200 |
| title | mybday.lol |
| description | Bid on your birthday. The highest bid owns the homepage. |
| canonical | — |
| h1 | October 10 |
| words | 204 |
| unique_pct | — |
| schema | — |
| og_image | — |

### `/october-7`

| Field | Value |
|---|---|
| status | 200 |
| title | October 7 Birthday: How Common It Is, Famous Birthdays & Who's #1 Today | mybday.lol |
| description | Everyone celebrating a birthday on October 7, ranked. See who owns the day, send them a gift, famous people born on October 7, and bid to take the top spot. |
| canonical | http://localhost:3000/october-7 |
| h1 | Everyone celebrating October 7 |
| words | 82 |
| unique_pct | 16 |
| schema | — |
| og_image | — |

### `/february-29`

| Field | Value |
|---|---|
| status | 200 |
| title | February 29 Birthday: How Common It Is, Famous Birthdays & Who's #1 Today | mybday.lol |
| description | Everyone celebrating a birthday on February 29, ranked. See who owns the day, send them a gift, famous people born on February 29, and bid to take the top spot. |
| canonical | http://localhost:3000/february-29 |
| h1 | Everyone celebrating February 29 |
| words | 82 |
| unique_pct | 19 |
| schema | — |
| og_image | — |

### `/december-25`

| Field | Value |
|---|---|
| status | 200 |
| title | December 25 Birthday: How Common It Is, Famous Birthdays & Who's #1 Today | mybday.lol |
| description | Everyone celebrating a birthday on December 25, ranked. See who owns the day, send them a gift, famous people born on December 25, and bid to take the top spot. |
| canonical | http://localhost:3000/december-25 |
| h1 | Everyone celebrating December 25 |
| words | 80 |
| unique_pct | 18 |
| schema | — |
| og_image | — |

### `/october`

| Field | Value |
|---|---|
| status | 404 |
| title | — |
| description | — |
| canonical | — |
| h1 | — |
| words | 0 |
| unique_pct | — |
| schema | — |
| og_image | — |

### `/how-it-works`

| Field | Value |
|---|---|
| status | 200 |
| title | How it works | mybday.lol |
| description | Every day, mybday.lol shows one person on its homepage. Whoever bids the most on that date gets the spot, until someone outbids them. |
| canonical | http://localhost:3000/how-it-works |
| h1 | One birthday. The whole internet. |
| words | 450 |
| unique_pct | — |
| schema | ['FAQPage'] |
| og_image | — |
