# Schema / Structured Data findings (seo-schema sub-agent)

Target: http://localhost:3100 (production build), audited 2026-10-10 from raw HTML (curl). Every JSON-LD block of all 382 sitemap URLs was parsed (not just the 8 requested pages), plus a 50-person random sample was checked against the live Wikidata API.

## Detection results

| Page | Blocks | Types | Valid JSON | @context |
|---|---|---|---|---|
| `/` | 1 (@graph) | Organization `#organization`, WebSite `#website` | yes | https://schema.org |
| `/how-it-works` | 1 | FAQPage (10 Question/Answer) | yes | https://schema.org |
| `/october` (x12 months) | 1 (@graph) | BreadcrumbList `/october#breadcrumb`, CollectionPage (+ ItemList of 31 dates) | yes | https://schema.org |
| `/october-7`, `/february-29`, `/october-10` (x366 dates) | 1 (@graph) | BreadcrumbList (3 levels), WebPage + ItemList of 15 Person | yes | https://schema.org |
| `/october-10/jess-moreno` (personal link) | 0 | none (canonical = `http://localhost:3100/october-10`) | n/a | n/a |
| `/terms`, `/privacy` | 0 | none | n/a | n/a |

Site-wide totals: 380 pages have exactly 1 JSON-LD block, 2 have none (`/terms`, `/privacy`). 378 BreadcrumbList, 366 WebPage, 12 CollectionPage, 1 Organization, 1 WebSite, 1 FAQPage. Zero Microdata, zero RDFa. Zero invalid JSON, zero duplicate `@id`, all `@context` use https, all URLs absolute (localhost:3100 now, swap to the production origin at launch).

## Validation results

- PASS Home: Organization has name, url, logo (`/icon` = 192x192 PNG, above Google's 112x112 minimum), email. WebSite has name, url, inLanguage, publisher pointing at `#organization` (resolves in the same graph).
- PASS Dates (all 366): `isPartOf -> /#website` and `breadcrumb -> #breadcrumb` resolve (the website node lives on the homepage; cross-page `@id` references are valid). Breadcrumb positions 1..3 are correct on every page, last item URL equals canonical. WebPage `url`/`@id` equal the canonical. Description is 120-160 chars on every date page.
- PASS Persons: 5,490 Person nodes (366 x exactly 15). Every one has name, description, birthDate (ISO 8601) and a `sameAs` of the form `https://www.wikidata.org/wiki/Q<digits>`. Birth month/day matches the page's date on every page. Wikidata spot check: 50 random QIDs, 50/50 correct (English label equals name, instance of human Q5, birthDate is one of the item's P569 values).
- PASS Months (12): BreadcrumbList (2 levels) + CollectionPage; `numberOfItems` matches the list length (Feb = 29), positions run 1..n, every url is `/<month>-<n>`.
- PASS How it works FAQPage: 10 questions each with `acceptedAnswer.text`; questions are visible on the page. Retention is a known decision (Google retired FAQ rich results May 2026), flagged as Info only.
- PASS Personal link: carries no schema of its own and canonicalizes to the date page, so there is no duplicate/conflicting entity. Correct.
- Not eligible but harmless: Google has no rich result for an ItemList of Persons, so these are entity/AI-readability signals, not SERP features. Breadcrumbs are the only block here that can change the SERP snippet.

## Findings

### F1 (Medium) 20 Wikidata people appear on two different dates with conflicting `birthDate`
Evidence (same `sameAs`, two pages, different birthDate): Jane Seymour Q123849 on `/february-15` (1951-02-15) and `/may-13` (1951-05-13); Emily Mortimer Q230308 on `/december-1` and `/october-6`; Ali Fazal Q4724794 on `/january-2` (1987-01-02) and `/october-15` (1986-10-15); Julianna Margulies Q229714 (Jun 8 / Aug 8); Joss Whedon Q298025 (Jan 23 / Jun 23); Jacob Batalon Q26213909 (Jun 6 / Oct 9); Tilda Swinton Q200534 (Nov 4 / Nov 5); also Zhang Yimou, Anna Torv, Gulzar, Lara Stone, Muggsy Bogues, Fatboy Slim, Jodie Whittaker, P. T. Usha, Annabella Sciorra, Bobby Cannavale, Jay Bothroyd, Tabitha St. Germain, Helen. 5,490 nodes but 5,470 distinct QIDs, so 20 duplicates (0.36%). Likely cause: Wikidata items carrying several P569 (date of birth) statements, with the importer keeping one per date. The same entity asserting two birthdays across the site is a contradiction for entity matching, and the person is listed on a date that is wrong for them.
Fix: at import, when an item has more than one distinct P569 value, use the statement with `rank: preferred` (or the single non-deprecated one), and skip the person if still ambiguous. Add a Vitest case: no `sourceId` appears on two dates.

### F2 (Low) "footballer" leaks into 353 Person descriptions while the site policy is "soccer"
Evidence: across all JSON-LD, `soccer` appears 727 times and `footballer` 353 times, on 221 date pages. `/february-29`: "Spanish footballer" (Ferran Torres), "Danish footballer"; `/october-10`: James Trafford "English footballer". The visible page shows the same text (2 visible "footballer" on `/february-29`). `web/src/lib/famous.ts` line 99 only rewrites `association football player/er`, not Wikidata's plain "footballer".
Fix: in `famous.ts` add `.replace(/\bfootballer\b/g, "soccer player")` after line 99 (American "football player" is two words so it is untouched), plus a test, then refresh the famous data so UI and JSON-LD update together.

### F3 (Low) `/how-it-works`, `/terms`, `/privacy` have no BreadcrumbList or WebPage node
Evidence: How it works has only the FAQPage block; Terms and Privacy have none (0 `application/ld+json`). Every other non-home page has a breadcrumb trail. The FAQPage also has no `@id` and is not tied to the `#website` entity.
Fix (JSON-LD below): add `WebPage` + `BreadcrumbList` (Home > Page) to those three pages; keep FAQPage as the page node on How it works.

### F4 (Low) Homepage WebSite `description` embeds the daily #1's name and amount
Evidence: `"description": "Today is October 10 and Jess Moreno owns it with $240. Every date has its own board: ..."`. It changes every midnight, names an individual in a site-level entity, and is stale in any cached copy. The changing content belongs in page text/meta description.
Fix: give WebSite a stable description (see JSON-LD below).

### F5 (Low) Organization is thin: no sameAs, no contactPoint, placeholder logo
Evidence: Organization = name, url, logo (`/icon`, placeholder "b" per known decisions), email only. No `sameAs` (no social profiles are linked anywhere on the site, so that is correct today).
Fix: when the client's logo and accounts exist, swap the logo file and add `sameAs` with the real profile URLs (do not invent any now). Add a `contactPoint` from the existing email (see JSON-LD).

### F6 (Low) No `dateModified` on date/month WebPage nodes
Evidence: WebPage/CollectionPage nodes have no `dateModified` although the sitemap carries a per-page `lastmod` (last claim/boost, famous refresh or `CONTENT_UPDATED`). Not required and ignored for rich results, but it makes freshness machine-readable and consistent with the sitemap.
Fix: reuse the sitemap lastmod as ISO 8601 `dateModified` in `seo.ts`. Only the real lastmod, never "now" per request.

### Info items (context, not bugs)
- I1 FAQPage on `/how-it-works` is valid and matches visible content; it earns no Google SERP feature since May 2026, any AI-search benefit is unconfirmed. Known and decided.
- I2 Homepage canonical is `http://localhost:3100` (no trailing slash) while schema `url` is `http://localhost:3100/`. Same URL (origin root), no action. Make sure the production site-URL env var has no path so the two stay equal.
- I3 Personal links (`/october-10/<slug>`) deliberately have no schema and canonicalize to the date page. Adding Person/ProfilePage there would conflict with the canonical and publish paying users' personal data as structured data. Recommend not adding it.
- I4 Not recommended: HowTo (retired), SearchAction/sitelinks searchbox (retired), Event (birthdays are not scheduled events with a location), Product/Offer (bids are not a catalog product), AggregateRating/Review (none exist; would be fabricated).
- I5 Person nodes have no `@id`/`url`. Fine: the Wikidata URL is Wikidata's identifier, not a node on this site, and `sameAs` already carries it.
- I6 Month and date descriptions contain live counts ("4 of 31 dates have a #1 so far", "Jess Moreno leads the 2026 board with $240"). Accurate and within length; they change as data changes.

## Recommended JSON-LD

### `/how-it-works` (replaces the lone FAQPage block; keep the 10 existing Question nodes in `mainEntity`)
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      "@id": "https://mybday.lol/how-it-works#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://mybday.lol/" },
        { "@type": "ListItem", "position": 2, "name": "How it works", "item": "https://mybday.lol/how-it-works" }
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "https://mybday.lol/how-it-works",
      "url": "https://mybday.lol/how-it-works",
      "name": "How it works",
      "inLanguage": "en-US",
      "isPartOf": { "@id": "https://mybday.lol/#website" },
      "breadcrumb": { "@id": "https://mybday.lol/how-it-works#breadcrumb" },
      "mainEntity": ["...the 10 existing Question nodes, unchanged..."]
    }
  ]
}
```
Use the production origin from the same site-URL helper that produces the canonicals (shown here as https://mybday.lol).

### `/terms` and `/privacy` (same shape, change name/path)
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      "@id": "https://mybday.lol/terms#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://mybday.lol/" },
        { "@type": "ListItem", "position": 2, "name": "Terms of Service", "item": "https://mybday.lol/terms" }
      ]
    },
    {
      "@type": "WebPage",
      "@id": "https://mybday.lol/terms",
      "url": "https://mybday.lol/terms",
      "name": "Terms of Service",
      "inLanguage": "en-US",
      "isPartOf": { "@id": "https://mybday.lol/#website" },
      "breadcrumb": { "@id": "https://mybday.lol/terms#breadcrumb" }
    }
  ]
}
```

### Homepage Organization/WebSite (stable description, contactPoint; add `sameAs` only when real profiles exist)
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://mybday.lol/#organization",
      "name": "mybday.lol",
      "url": "https://mybday.lol/",
      "logo": "https://mybday.lol/icon",
      "email": "mybdaylol@gmail.com",
      "contactPoint": { "@type": "ContactPoint", "contactType": "customer support", "email": "mybdaylol@gmail.com" }
    },
    {
      "@type": "WebSite",
      "@id": "https://mybday.lol/#website",
      "name": "mybday.lol",
      "url": "https://mybday.lol/",
      "description": "A birthday leaderboard: every date has its own board, bid for the top spot, boost friends and send gifts straight to them.",
      "inLanguage": "en-US",
      "publisher": { "@id": "https://mybday.lol/#organization" }
    }
  ]
}
```

## Category score: 84 / 100

Deductions: duplicate-entity birthDate conflicts (-6), missing BreadcrumbList/WebPage on three pages (-4), volatile WebSite description and thin Organization (-3), "footballer" inconsistency (-1), no dateModified (-2).

## What works
- One valid JSON-LD block on 380 of 382 URLs, zero parse errors, consistent https://schema.org context, absolute URLs, unique `@id`s, correct `@id` cross-references (`#website`, `#organization`, `#breadcrumb`).
- BreadcrumbList on all 378 date/month pages, correct positions, last item equals canonical, matches the visible hierarchy.
- 5,490 Person entities, each with a well-formed Wikidata `sameAs` (50/50 sampled verified live, including birthDate and human type); clean ISO 8601 dates, including Feb 29.
- Month CollectionPage/ItemList counts and URLs correct for all 12 months (Feb = 29).
- Personal links add no conflicting schema; FAQPage valid and kept deliberately; no deprecated types (no HowTo/SpecialAnnouncement) anywhere.
