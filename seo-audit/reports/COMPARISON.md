# SEO audit: before and after step 9

Same checks, same pages, run with claude-seo 2.4.2's analysers against a production build (`pnpm build && pnpm start`). Before: 2026-10-10T07:46:15+00:00. After: 2026-10-10T09:46:24+00:00.

## Scores

| | Before | After | Change |
|---|---:|---:|---:|
| **Overall** | **46** | **97** | **+51** |
| Crawlability | 23 | 100 | +77 |
| Indexability | 70 | 100 | +30 |
| On-page | 82 | 100 | +18 |
| Content | 7 | 40 | +33 |
| Structured data | 75 | 100 | +25 |
| Sharing | 0 | 100 | +100 |
| Security | 0 | 100 | +100 |

**25 checks fixed, 2 still failing** (of 44).

## Every check

| Check | Severity | Before | After | After, detail |
|---|---|:-:|:-:|---|
| Public pages are not noindex | critical | ✅ | ✅ | 382/382 pass |
| robots.txt does not block pages that should be indexed or read | critical | ✅ | ✅ |  |
| All JSON-LD blocks parse | critical | ✅ | ✅ | 382/382 pass |
| Every public page (366 dates, 12 months, home, FAQ, legal) answers 200 | critical | ❌ | ✅ | 382/382 pass |
| Every page has a title | critical | ✅ | ✅ | 382/382 pass |
| Every public page has an absolute, self-referencing canonical | high | ❌ | ✅ | 382/382 pass |
| Every date and month page is within 3 clicks of the homepage | high | ❌ | ✅ | 378/378 pass |
| Every page has a meta description | high | ✅ | ✅ | 382/382 pass |
| Descriptions are unique | high | ✅ | ✅ | 382/382 pass |
| Each month page (hub) links to every date in it | high | ❌ | ✅ | 12/12 pass |
| No internal link leads to an error page | high | ❌ | ✅ | 383/383 pass |
| Share images load (sampled: home, 3 dates, a month, FAQ, a personal link) | high | ❌ | ✅ | 7/7 pass |
| Open Graph title, description, url and image on every shareable page | high | ❌ | ✅ | 380/380 pass |
| Exactly one H1 per page | high | ✅ | ✅ | 382/382 pass |
| robots.txt exists | high | ❌ | ✅ |  |
| No deprecated schema types (HowTo, SpecialAnnouncement…) | high | ✅ | ✅ | 382/382 pass |
| Sitemap lists home, FAQ, all 366 dates and all 12 months | high | ❌ | ✅ | 380/380 pass |
| sitemap.xml exists and parses | high | ❌ | ✅ |  |
| Titles are unique | high | ✅ | ✅ | 382/382 pass |
| Date pages are ≥40% unique (average 37%, measured on 3-word sequences in the main content) | high | ❌ | ❌ | 17/366 pass |
| Personal links canonicalise to their date page | medium | ✅ | ✅ |  |
| Descriptions don't restate the title (metadata_template site_risk: low) | medium | ❌ | ✅ | 382/382 pass |
| Pages declare a language and a mobile viewport | medium | ✅ | ✅ | 382/382 pass |
| Claim, checkout result and unsubscribe pages are noindex | medium | ❌ | ✅ | 4/4 pass |
| Personal links share their own card (handoff v2) | medium | ❌ | ✅ |  |
| robots.txt points to the sitemap | medium | ❌ | ✅ |  |
| Date pages carry BreadcrumbList + WebPage | medium | ❌ | ✅ | 366/366 pass |
| Home pages carry Organization + WebSite | medium | ❌ | ✅ | 1/1 pass |
| Month pages carry BreadcrumbList + CollectionPage | medium | ✅ | ✅ | 12/12 pass |
| Sitemap holds no noindex, redirected or missing URLs | medium | ✅ | ✅ |  |
| claude-seo sitemap_discovery finds a valid sitemap | medium | ❌ | ✅ |  |
| Impossible dates answer 404, not a page | medium | ✅ | ✅ | 3/3 pass |
| Date and month pages have 300+ words of main content | medium | ❌ | ✅ | 378/378 pass |
| Titles are 30–60 characters (Google truncates around 60) | medium | ❌ | ✅ | 382/382 pass |
| content_quality.py scores 60+ on main content | low | ✅ | ✅ | 382/382 pass |
| Descriptions are 120–160 characters | low | ❌ | ✅ | 382/382 pass |
| Clickjacking protection (X-Frame-Options or CSP frame-ancestors) | low | ❌ | ✅ |  |
| referrer-policy header | low | ❌ | ✅ |  |
| x-content-type-options header | low | ❌ | ✅ |  |
| Heading levels don't skip (H2 → H4) | low | ✅ | ✅ | 382/382 pass |
| Homepage explains itself in 500+ words (204 now) | low | ❌ | ❌ |  |
| Old /oct-7 share links redirect permanently to /october-7 | low | ✅ | ✅ |  |
| Sitemap entries carry <lastmod> | low | ❌ | ✅ |  |
| Twitter/X card is summary_large_image | low | ❌ | ✅ | 380/380 pass |

## Still failing

- **Date pages are ≥40% unique (average 37%, measured on 3-word sequences in the main content)** (high; 17/366 pass). E.g. `/april-1 (38%)`, `/april-10 (35%)`, `/april-11 (37%)`, `/april-12 (37%)`, `/april-13 (34%)`, `/april-14 (36%)`
- **Homepage explains itself in 500+ words (204 now)** (low; fail). E.g. `/ (204)`

## Sample pages

### `/`

| | Before | After |
|---|---|---|
| status | 200 | 200 |
| title | mybday.lol | Birthday Leaderboard: Bid to Own Today's Spot |
| description | Bid on your birthday. The highest bid owns the homepage. | Today is October 10 and Jess Moreno owns it with $240. Every date has its own board: bid for the top spot, boost friends and send gifts straight to them. |
| h1 | October 10 | October 10 |
| words | 204 | 204 |
| unique_pct | — | — |
| schema | — | Organization, WebSite |
| og_image | — | http://localhost:3000/opengraph-image?7c77e54f5620a203 |

### `/october-7`

| | Before | After |
|---|---|---|
| status | 200 | 200 |
| title | October 7 Birthday: How Common It Is, Famous Birthdays & Who's #1 Today \| mybday.lol | October 7 Birthday: Famous People, Facts & Who's #1 |
| description | Everyone celebrating a birthday on October 7, ranked. See who owns the day, send them a gift, famous people born on October 7, and bid to take the top spot. | Born on October 7: Shawn Ashmore and Simon Cowell. It's the 118th most common birthday in the US. Nobody has claimed it for 2027 yet. Bids start at $5. |
| h1 | Everyone celebrating October 7 | Everyone celebrating October 7 |
| words | 82 | 320 |
| unique_pct | 16 | 37 |
| schema | — | BreadcrumbList, WebPage |
| og_image | — | http://localhost:3000/october-7/opengraph-image?3fde5180ea8f94b0 |

### `/february-29`

| | Before | After |
|---|---|---|
| status | 200 | 200 |
| title | February 29 Birthday: How Common It Is, Famous Birthdays & Who's #1 Today \| mybday.lol | February 29 Birthday: Famous People, Facts & Who's #1 |
| description | Everyone celebrating a birthday on February 29, ranked. See who owns the day, send them a gift, famous people born on February 29, and bid to take the top spot. | Born on February 29: Ferran Torres. The rarest birthday of all, here once every four years. Nobody has claimed it for 2028 yet. Bids start at $5. |
| h1 | Everyone celebrating February 29 | Everyone celebrating February 29 |
| words | 82 | 314 |
| unique_pct | 19 | 55 |
| schema | — | BreadcrumbList, WebPage |
| og_image | — | http://localhost:3000/february-29/opengraph-image?3fde5180ea8f94b0 |

### `/december-25`

| | Before | After |
|---|---|---|
| status | 200 | 200 |
| title | December 25 Birthday: How Common It Is, Famous Birthdays & Who's #1 Today \| mybday.lol | December 25 Birthday: Famous People, Facts & Who's #1 |
| description | Everyone celebrating a birthday on December 25, ranked. See who owns the day, send them a gift, famous people born on December 25, and bid to take the top spot. | Born on December 25: Jeremy Strong and Sissy Spacek. It's the 365th most common birthday in the US. Nobody has claimed it for 2026 yet. Bids start at $5. |
| h1 | Everyone celebrating December 25 | Everyone celebrating December 25 |
| words | 80 | 324 |
| unique_pct | 18 | 40 |
| schema | — | BreadcrumbList, WebPage |
| og_image | — | http://localhost:3000/december-25/opengraph-image?3fde5180ea8f94b0 |

### `/october`

| | Before | After |
|---|---|---|
| status | 404 | 200 |
| title | — | October Birthdays: Famous People, Facts & Top Bids |
| description | — | October's most common birthday is October 1 and its rarest is October 31. Birthstone opal, flower marigold. 4 of 31 dates have a #1 so far. |
| h1 | — | October birthdays |
| words | 0 | 612 |
| unique_pct | — | — |
| schema | — | BreadcrumbList, CollectionPage |
| og_image | — | http://localhost:3000/october/opengraph-image?3fde5180ea8f94b0 |

### `/how-it-works`

| | Before | After |
|---|---|---|
| status | 200 | 200 |
| title | How it works \| mybday.lol | How It Works: Bids, Boosts and Birthday Gifts \| mybday.lol |
| description | Every day, mybday.lol shows one person on its homepage. Whoever bids the most on that date gets the spot, until someone outbids them. | Bid on any date, boost friends up the board and send gifts that go straight to them. How the birthday leaderboard works, with answers to common questions. |
| h1 | One birthday. The whole internet. | One birthday. The whole internet. |
| words | 450 | 450 |
| unique_pct | — | — |
| schema | FAQPage | FAQPage |
| og_image | — | http://localhost:3000/how-it-works/opengraph-image?011bcb957a38f226 |

