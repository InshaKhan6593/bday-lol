# /seo page: /october-7

**Run:** 2026-10-11, claude-seo v2.4.0 `seo-page` skill, production build on `http://localhost:3100`. An unclaimed
date (its 2027 board is open), so it stands in for most of the 366 date pages.

```
Overall Score: 81/100

On-Page SEO:     88/100  █████████░
Content Quality: 68/100  ███████░░░
Technical:       82/100  ████████░░
Schema:          88/100  █████████░
Images:          85/100  █████████░
```

| Element | Value | Verdict |
|---|---|---|
| Title | "October 7 Birthday: Famous People, Facts & Who's #1" (51) | ✅ in range, keyword first |
| Description | "Born on October 7: Shawn Ashmore and Simon Cowell. It's the 118th most common birthday in the US. Nobody has claimed it for 2027 yet. Bids start at $5." (151) | ✅ not templated (`metadata_template.py`: none) |
| H1 | "Everyone celebrating October 7" | ⚠️ one H1, but no "birthday" (mockup copy) |
| Headings | H1 → H2 "About October 7 birthdays" → H3 "Famous people born on October 7" | ✅ no skipped level |
| Canonical / robots | self / indexable | ✅ |
| Open Graph + X card | all tags, 1200×630 image, `summary_large_image` | ✅ |
| Main content | 338 words; `content_quality.py` 92, no filler or AI patterns, flag "repetitive" | ⚠️ just over the 300 floor |
| Links | 26 internal (21 unique), 1 external (icon credit) | ✅; no link out to a source |
| Schema | BreadcrumbList (3 levels) + WebPage with 15 Person nodes (Wikidata `sameAs`, `birthDate`) | ✅ valid |
| Images | none (`<img>` count 0) | nothing to fail; no photos either |
| Response | 200, `Cache-Control: private, no-cache, no-store`, `X-Powered-By: Next.js` | ⚠️ |

## Issues

**High**

- Not cacheable: `no-store` on a page that changes only when someone pays. Use a short revalidate plus
  `revalidateTag` from the Stripe webhook.

**Medium**

- "Simon Cowell … Age 68": he's 67 today. The number is the age he turns on Oct 7, 2027. Label it "Turns 68".
- Sign, birthstone and flower sit only in fact cards, so text extractors (and AI answers) drop Libra, opal and marigold.
  Add one sentence to the About paragraph.
- The famous list comes after the bid card and the facts. On an unclaimed date it's the only "people" on the page.
- About 37% unique against the other date pages (strict measure). Holiday or observance context would raise it.

**Low**

- No `dateModified`, no visible "updated" line.
- Wikidata is credited only in the JSON-LD; FiveThirtyEight is the only visible source, and it isn't a link.
- "Nobody has claimed October 7" appears three times.
- About 240 KB gzipped JS/CSS; simulated mobile LCP 3.0 s (Lighthouse 95, CLS 0).

## Schema suggestion

Add `dateModified` to the existing WebPage node, from the same timestamp the sitemap's `lastmod` uses:

```json
{ "@type": "WebPage", "@id": "https://mybday.lol/october-7#webpage", "dateModified": "2026-10-10T12:33:57Z" }
```

No other type is recommended. Don't add Event, Product or FAQ markup here.
