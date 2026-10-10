# SEO audit: mybday.lol (after)

Run 2026-10-10T09:46:24+00:00 against `http://localhost:3000` with claude-seo 2.4.2 analysers. 387 URLs fetched.

## Overall score: 97/100

```
Crawlability     100/100  ██████████
Indexability     100/100  ██████████
On-page          100/100  ██████████
Content           40/100  ████░░░░░░
Structured data  100/100  ██████████
Sharing          100/100  ██████████
Security         100/100  ██████████
```

## Failing checks

### High

- **Date pages are ≥40% unique (average 37%, measured on 3-word sequences in the main content)** (Content; 17/366 pass). E.g. `/april-1 (38%)`, `/april-10 (35%)`, `/april-11 (37%)`, `/april-12 (37%)`, `/april-13 (34%)`, `/april-14 (36%)` _Source: seo-programmatic: Thin Content Safeguards_

### Low

- **Homepage explains itself in 500+ words (204 now)** (Content; fail). E.g. `/ (204)` _Source: quality-gates.md (homepage)_

## All checks

| | Check | Category | Severity | Result |
|---|---|---|---|---|
| ✅ | Every public page (366 dates, 12 months, home, FAQ, legal) answers 200 | Crawlability | critical | 382/382 pass |
| ✅ | robots.txt exists | Crawlability | high | pass |
| ✅ | robots.txt points to the sitemap | Crawlability | medium | pass |
| ✅ | robots.txt does not block pages that should be indexed or read | Crawlability | critical | pass |
| ✅ | sitemap.xml exists and parses | Crawlability | high | pass |
| ✅ | Sitemap lists home, FAQ, all 366 dates and all 12 months | Crawlability | high | 380/380 pass |
| ✅ | Sitemap holds no noindex, redirected or missing URLs | Crawlability | medium | pass |
| ✅ | Sitemap entries carry <lastmod> | Crawlability | low | pass |
| ✅ | claude-seo sitemap_discovery finds a valid sitemap | Crawlability | medium | pass |
| ✅ | Each month page (hub) links to every date in it | Crawlability | high | 12/12 pass |
| ✅ | Every date and month page is within 3 clicks of the homepage | Crawlability | high | 378/378 pass |
| ✅ | No internal link leads to an error page | Crawlability | high | 383/383 pass |
| ✅ | Old /oct-7 share links redirect permanently to /october-7 | Crawlability | low | pass |
| ✅ | Public pages are not noindex | Indexability | critical | 382/382 pass |
| ✅ | Claim, checkout result and unsubscribe pages are noindex | Indexability | medium | 4/4 pass |
| ✅ | Every public page has an absolute, self-referencing canonical | Indexability | high | 382/382 pass |
| ✅ | Personal links canonicalise to their date page | Indexability | medium | pass |
| ✅ | Impossible dates answer 404, not a page | Indexability | medium | 3/3 pass |
| ✅ | Pages declare a language and a mobile viewport | Indexability | medium | 382/382 pass |
| ✅ | Every page has a title | On-page | critical | 382/382 pass |
| ✅ | Titles are 30–60 characters (Google truncates around 60) | On-page | medium | 382/382 pass |
| ✅ | Titles are unique | On-page | high | 382/382 pass |
| ✅ | Every page has a meta description | On-page | high | 382/382 pass |
| ✅ | Descriptions are 120–160 characters | On-page | low | 382/382 pass |
| ✅ | Descriptions are unique | On-page | high | 382/382 pass |
| ✅ | Descriptions don't restate the title (metadata_template site_risk: low) | On-page | medium | 382/382 pass |
| ✅ | Exactly one H1 per page | On-page | high | 382/382 pass |
| ✅ | Heading levels don't skip (H2 → H4) | On-page | low | 382/382 pass |
| ✅ | Date and month pages have 300+ words of main content | Content | medium | 378/378 pass |
| ❌ | Date pages are ≥40% unique (average 37%, measured on 3-word sequences in the main content) | Content | high | 17/366 pass |
| ✅ | content_quality.py scores 60+ on main content | Content | low | 382/382 pass |
| ❌ | Homepage explains itself in 500+ words (204 now) | Content | low | fail |
| ✅ | All JSON-LD blocks parse | Structured data | critical | 382/382 pass |
| ✅ | Home pages carry Organization + WebSite | Structured data | medium | 1/1 pass |
| ✅ | Date pages carry BreadcrumbList + WebPage | Structured data | medium | 366/366 pass |
| ✅ | Month pages carry BreadcrumbList + CollectionPage | Structured data | medium | 12/12 pass |
| ✅ | No deprecated schema types (HowTo, SpecialAnnouncement…) | Structured data | high | 382/382 pass |
| ✅ | Open Graph title, description, url and image on every shareable page | Sharing | high | 380/380 pass |
| ✅ | Twitter/X card is summary_large_image | Sharing | low | 380/380 pass |
| ✅ | Share images load (sampled: home, 3 dates, a month, FAQ, a personal link) | Sharing | high | 7/7 pass |
| ✅ | Personal links share their own card (handoff v2) | Sharing | medium | pass |
| ✅ | x-content-type-options header | Security | low | pass |
| ✅ | referrer-policy header | Security | low | pass |
| ✅ | Clickjacking protection (X-Frame-Options or CSP frame-ancestors) | Security | low | pass |

## Sample pages

### `/`

| Field | Value |
|---|---|
| status | 200 |
| title | Birthday Leaderboard: Bid to Own Today's Spot |
| description | Today is October 10 and Jess Moreno owns it with $240. Every date has its own board: bid for the top spot, boost friends and send gifts straight to them. |
| canonical | http://localhost:3000 |
| h1 | October 10 |
| words | 204 |
| unique_pct | — |
| schema | ['Organization', 'WebSite'] |
| og_image | http://localhost:3000/opengraph-image?7c77e54f5620a203 |

### `/october-7`

| Field | Value |
|---|---|
| status | 200 |
| title | October 7 Birthday: Famous People, Facts & Who's #1 |
| description | Born on October 7: Shawn Ashmore and Simon Cowell. It's the 118th most common birthday in the US. Nobody has claimed it for 2027 yet. Bids start at $5. |
| canonical | http://localhost:3000/october-7 |
| h1 | Everyone celebrating October 7 |
| words | 320 |
| unique_pct | 37 |
| schema | ['BreadcrumbList', 'WebPage'] |
| og_image | http://localhost:3000/october-7/opengraph-image?3fde5180ea8f94b0 |

### `/february-29`

| Field | Value |
|---|---|
| status | 200 |
| title | February 29 Birthday: Famous People, Facts & Who's #1 |
| description | Born on February 29: Ferran Torres. The rarest birthday of all, here once every four years. Nobody has claimed it for 2028 yet. Bids start at $5. |
| canonical | http://localhost:3000/february-29 |
| h1 | Everyone celebrating February 29 |
| words | 314 |
| unique_pct | 55 |
| schema | ['BreadcrumbList', 'WebPage'] |
| og_image | http://localhost:3000/february-29/opengraph-image?3fde5180ea8f94b0 |

### `/december-25`

| Field | Value |
|---|---|
| status | 200 |
| title | December 25 Birthday: Famous People, Facts & Who's #1 |
| description | Born on December 25: Jeremy Strong and Sissy Spacek. It's the 365th most common birthday in the US. Nobody has claimed it for 2026 yet. Bids start at $5. |
| canonical | http://localhost:3000/december-25 |
| h1 | Everyone celebrating December 25 |
| words | 324 |
| unique_pct | 40 |
| schema | ['BreadcrumbList', 'WebPage'] |
| og_image | http://localhost:3000/december-25/opengraph-image?3fde5180ea8f94b0 |

### `/october`

| Field | Value |
|---|---|
| status | 200 |
| title | October Birthdays: Famous People, Facts & Top Bids |
| description | October's most common birthday is October 1 and its rarest is October 31. Birthstone opal, flower marigold. 4 of 31 dates have a #1 so far. |
| canonical | http://localhost:3000/october |
| h1 | October birthdays |
| words | 612 |
| unique_pct | — |
| schema | ['BreadcrumbList', 'CollectionPage'] |
| og_image | http://localhost:3000/october/opengraph-image?3fde5180ea8f94b0 |

### `/how-it-works`

| Field | Value |
|---|---|
| status | 200 |
| title | How It Works: Bids, Boosts and Birthday Gifts | mybday.lol |
| description | Bid on any date, boost friends up the board and send gifts that go straight to them. How the birthday leaderboard works, with answers to common questions. |
| canonical | http://localhost:3000/how-it-works |
| h1 | One birthday. The whole internet. |
| words | 450 |
| unique_pct | — |
| schema | ['FAQPage'] |
| og_image | http://localhost:3000/how-it-works/opengraph-image?011bcb957a38f226 |
