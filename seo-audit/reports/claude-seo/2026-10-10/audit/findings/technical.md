# Technical SEO findings: http://localhost:3100 (production build)

Audited 2026-10-10. Sample: `/`, `/how-it-works`, `/terms`, `/privacy`, `/october`, `/february`, `/october-7`, `/february-29`, `/december-31`, `/october-10`, personal link `/october-10/jess-moreno`, `/claim`, `/claim/success`, `/unsubscribe`, 404 URLs, plus redirect and variant probes. Method: curl, plugin `sitemap_discovery.py` and `render_page.py`, build output in `web/.next` (read-only). No HTTPS/HSTS, CWV field data or Search Console data (known, see brief).

**Technical score: 84 / 100**

| Category | Status | Note |
|---|---|---|
| Crawlability | Pass | robots.txt valid, sitemap validated by the helper, noindex pages left crawlable |
| Indexability | Pass with caveats | canonicals correct; famous-people content missing in this build (F1) |
| Security | Pass (local) | 5 headers present; HSTS/HTTPS pending live site (known) |
| URL structure / redirects | Pass | single-hop 308s; one 2-hop case (F8) |
| Mobile | Pass | viewport set, 40-52 px controls |
| Core Web Vitals (source) | Pass with caveats | no images, fonts preloaded, but all pages uncached and about 0.8 MB raw JS+CSS (F2, F4) |
| Structured data | Pass | valid JSON-LD on all public templates |
| JS rendering | Pass | fully server-rendered; plugin reports `is_spa: false` |
| 404 handling | Fail (minor) | correct 404 status, but blank body for no-JS clients (F3) |
| IndexNow | Not implemented | Info (F11) |

## Findings

### F1 [High] No famous people render on any sampled date or month page, although titles promise them
Evidence: `/october-7`, `/october-10`, `/december-31`, `/february-29` main content contains no famous names. Main text on `/october-7` is 215 words and ends with the fact cards ("...Day of the year 280th ... October 6 ... October 8"). `About.tsx` hides the block when the list is empty (`{famous.length > 0 && ...}`). Titles read "October 7 Birthday: Famous People, Facts & Who's #1", and the date WebPage JSON-LD has no `mainEntity` (06-seo.md says it should hold the famous Persons with Wikidata `sameAs`). Month pages likewise show no "two famous names" per date.
Likely cause: the `famous` table is empty in the audited database. Production fills it only through the cron `17 6 1-12 * *` (day N refreshes month N), so on launch day the table stays empty until the cron has run for each month (up to 12 days/months later).
Impact: the title/H1 promise a feature the page does not show (relevance and bounce risk); date pages are thin (243-248 words including chrome, below the 300 floor cited in the brief); the 37% unique-content figure in the brief should be re-measured once the list is filled.
Fix: run `pnpm famous:refresh` (all months) against the production DB as part of the launch runbook, then re-run this audit. Do not rely on the 1-12 monthly cron for the first fill. Optionally fall back to a "Facts & Who's #1" title when the list is empty.

### F2 [Medium] Every public page is dynamic and sent with `Cache-Control: private, no-cache, no-store`
Evidence: all HTML responses (including `/terms`, `/privacy`, `/how-it-works` and the 366 date pages) return `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`. `prerender-manifest.json` lists only `_global-error`, `_not-found`, icons, robots, styleguide and the how-it-works OG image as prerendered. `/terms` calls `await connection()` on purpose so admin edits show without a deploy. Local TTFB is 14-56 ms with a local DB, so this is a production-scale concern, not a measured defect.
Impact: no CDN caching; each crawler or visitor hit runs a function plus DB queries; slower TTFB/LCP under load and on cold starts; Googlebot crawl rate is limited by response time.
Fix: cache with tags and invalidate on change (Next `cacheComponents` / `use cache` with `cacheLife`, or `revalidate` plus `revalidateTag` in the claim, boost and admin-edit actions). Legal and How-it-works pages can be static with on-demand revalidation. Keep the homepage and today's board short-lived (for example 60 s).

### F3 [Medium] 404 for unknown dates and slugs has an empty body without JavaScript
Evidence: `/nonexistent-xyz`, `/october-32`, `/february-30`, `/oct-07`, `/October-7` return HTTP 404 with `<meta name="robots" content="noindex"/>` (correct), but the HTML is `<html id="__next_error__">` with `<body><div hidden=""><!--$--><!--/$--></div>` followed by scripts. The text "404: This page could not be found." exists only in the RSC payload and is rendered client-side. `<html>` has no `lang`, `<title>` is just "mybday.lol", and there is no link to the homepage or months. The build's static `_not-found.html` does contain an `<h1>404</h1>`, so only the dynamic `[slug]` path is affected. No `not-found.tsx` exists in `src/app`.
Impact: crawlers are fine (status and noindex are right), but agents, no-JS clients and link previewers see a blank page, and a person with a mistyped date gets no navigation.
Fix: add `src/app/not-found.tsx` (server component inside the root layout) with an H1, a sentence, links to `/`, the months and `/claim`, and a title such as "Page not found | mybday.lol".

### F4 [Medium] About 0.8 MB of raw JS+CSS (about 240 KB gzip) even on static text pages
Evidence: counting every `<script src>` and stylesheet referenced by each page: `/` 11 JS + 4 CSS = 806 KB raw / 244 KB gzip; `/october-7` 837 KB / 254 KB; `/terms` (legal text, no forms) 10 JS + 2 CSS = 777 KB / 234 KB. All scripts are `async`, none block parsing; 2-4 render-blocking stylesheets in `<head>`. Assets are `public, max-age=31536000, immutable`.
Impact: INP and TBT risk on low-end phones; cannot be measured locally (no field data).
Fix: inspect with `@next/bundle-analyzer`; keep client components (`ScrollToTop`, countdown, bid form, menus) off content-only routes and lazy-load the claim and boost forms. Re-test with PageSpeed Insights after launch.

### F5 [Low] Terms and Privacy have no `og:image` / `twitter:image` but declare `twitter:card = summary_large_image`
Evidence: `grep -c og:image`: `/terms` 0, `/privacy` 0, `/how-it-works` 1. The card type comes from the root layout default.
Impact: shared links render a card with no picture.
Fix: add the default `/opengraph-image` in `pageMetadata` for these two pages (or set `twitter: { card: "summary" }` for them).

### F6 [Low] `X-Powered-By: Next.js` is exposed
Evidence: response header on HTML and redirects.
Fix: `poweredByHeader: false` in `next.config.ts`.

### F7 [Low] Homepage canonical and `og:url` have no trailing slash, while the sitemap and JSON-LD do
Evidence: `<link rel="canonical" href="http://localhost:3100"/>` vs `<loc>http://localhost:3100/</loc>` and `"url":"http://localhost:3100/"`. Same URL for a root path, so no harm.
Fix: optional; pass `/` consistently so a diff tool does not flag it.

### F8 [Low] Redirect and URL variants
Evidence: `/oct-7` and `/feb-29` return one `308` to `/october-7` and `/february-29` (good, permanent). `/october-7/` returns `308` to `/october-7`. `/oct-7/` takes 2 hops (`/oct-7/` -> `/oct-7` -> `/october-7`). `/October-7`, `/october-07`, `/oct-07` return 404. Unknown person slug `/october-7/jess-moreno` returns `307` to `/october-7` (temporary, sensible because the person may claim later). `/october-7?utm_source=x` returns 200 and keeps the clean canonical.
Fix: optional: one redirect rule that lower-cases and strips leading zeros, and make alias plus trailing slash a single hop.

### F9 [Low] Security headers: CSP has only `frame-ancestors`; no skip link
Evidence: present on every response: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. HSTS missing locally (known). No full CSP (`script-src`), acceptable for launch. No skip-to-content link in any sample, though `<main>`, `<nav>`, `<header>`, `<footer>` landmarks exist on every page.
Fix: set HSTS on the live custom domain (`max-age=63072000; includeSubDomains`), consider a report-only CSP later, add a skip link.

### F10 [Info] Touch targets
Evidence: `IconButton` size `sm` is 40x40 px (`IconButton.module.css`); other controls use `--control-sm: 44px` up to `--control-xl`. Above the WCAG 2.2 minimum (24 px), under the 44 px best practice for the 40 px variant.

### F11 [Info] Agent UX and extras
Evidence: `/llms.txt`, `/llms-full.txt`, `/ai.txt`, `/humans.txt`, `/.well-known/security.txt`, `/favicon.ico`, `/manifest.webmanifest` all return 404 (icons are served at `/icon` and `/apple-icon` and linked in `<head>`, so the `/favicon.ico` 404 is harmless). No IndexNow key file or submission code (`grep indexnow` finds nothing); IndexNow would help Bing/Yandex discover 366 date pages whose boards change daily. `Accept: text/markdown` is not honoured (returns HTML). All agent-relevant content is in server HTML, forms use real `<form>`/`<button>`, and prev/next and month links have `aria-label`.
Fix: optional `llms.txt` with the page map, an IndexNow key plus a ping on claim/boost, `security.txt` once a contact exists.

### F12 [Info] Known and decided (context, not new bugs)
- Date pages about 37% unique on the strict 3-word comparison; I measured 44-45% 3-word overlap between `/october-7` and `/february-29` main text, consistent with the brief (F1: the missing famous list lowers uniqueness further).
- Homepage about 204 words (236 in the body including chrome); mockup copy.
- FAQPage JSON-LD on How it works, kept on purpose.
- No HTTPS/HSTS, CWV field data or Search Console data locally.
- Date and month titles without the brand suffix (measured 50-53 characters, all within 60); titles with the suffix on other pages are 45-58.
- All AI crawlers allowed.
- Placeholder "b" icon (Organization `logo` points at `/icon`, a 192 px placeholder).

## Evidence of what is correct

**Crawlability.** `robots.txt` (200, `text/plain`): `User-Agent: *`, `Allow: /`, `Disallow: /api/`, `/admin`, `/dev/`, `/styleguide`, `Sitemap: http://localhost:3100/sitemap.xml`. `_next/` assets are not blocked. `/styleguide`, `/dev`, `/admin` return 404. Plugin `sitemap_discovery.py`: the declared sitemap is `kind: urlset`, `valid: true`, HTTP 200; fallback paths (`sitemap_index.xml`, `sitemap-index.xml`, `wp-sitemap.xml`) are 404, as expected for a single sitemap.

**Sitemap.** 382 unique URLs (home, how-it-works, terms, privacy, 12 months, 366 dates), no personal links, no `/claim`, `/claim/success` or `/unsubscribe`, no query strings. `lastmod` is data-driven: 376 URLs at `2026-10-10T00:00:00Z` (content date) and 6 at `2026-10-10T10:05:01Z` (boards with activity), matching `sitemap.ts`. No `priority`/`changefreq` (good, ignored by Google). 38 KB, far under the 50,000 URL / 50 MB limits.

**Indexability.** Every public page has one self-referencing absolute canonical (`/`, `/how-it-works`, `/terms`, `/privacy`, `/october`, `/february`, `/october-7`, `/february-29`, `/december-31`, `/october-10`). The personal link `/october-10/jess-moreno` returns 200 with `canonical` = `http://localhost:3100/october-10`, its own `og:url` and OG image, title "It's Jess's birthday on October 10 | mybday.lol" (47 characters), and is not in the sitemap. `/claim` is `noindex, follow`; `/claim/success` and `/unsubscribe` are `noindex, nofollow`; 404 is `noindex`. All are crawlable, so the noindex is readable.

**Metadata.** Titles 45-58 characters on public pages; descriptions 123-159 characters; one H1 per page; OG image 1200x630 with alt text, `og:locale`, `og:site_name`; unique OG image per date and month; `lang="en"`; viewport `width=device-width, initial-scale=1` (no zoom lock).

**Structured data.** Home: Organization + WebSite (`@graph`, linked `@id`). Date: BreadcrumbList + WebPage (`isPartOf`, `breadcrumb`). Month: BreadcrumbList + CollectionPage with an ItemList of 31 links. How it works: FAQPage. All blocks parse as valid JSON; the plugin reports `valid: true` for `/october-7`.

**Rendering.** Raw HTML contains all content (board entries, facts, nav, JSON-LD). Plugin: `is_spa: false`, `mode_used: raw`, no console errors. The countdown is a `<time datetime="2026-10-11T04:00:00.000Z">` (midnight ET) enhanced on the client; nothing layout-critical is client-only.

**Performance from source.** Zero `<img>` tags (avatars are initials, OG images are separate routes), so no LCP image or image-driven CLS risk. Font is `next/font` self-hosted, preloaded, `display: swap`. Static assets are immutable for one year. HTML is gzip-compressed (`Content-Encoding: gzip`); uncompressed HTML is 27-84 KB.

**Security (local).** The five headers above are on every response including redirects and the sitemap.

## What works
- Clean, lowercase, hyphenated URLs with no params; 308 permanent aliases (`/oct-7`, `/feb-29`) and trailing-slash normalisation.
- Canonical strategy for personal links and noindex strategy for transactional pages are correct and verifiable.
- Complete, validated sitemap with honest `lastmod`; robots.txt points to it.
- Server-rendered pages with consistent landmarks and strong internal linking (prev/next day, month page lists all dates, all 12 months in every footer, month hub one click from every date).
- Unique, length-safe titles and descriptions built from real data on all 366 dates.

## Priority list
1. F1 Backfill famous people for all 12 months before launch and re-audit (High).
2. F2 Cache date, month and legal pages with tag-based revalidation (Medium).
3. F3 Add a server-rendered `not-found.tsx` (Medium).
4. F4 Trim client JS on content-only routes (Medium).
5. F5-F9 small header, social-card and redirect cleanups (Low).

**Category score: 84 / 100** (crawlability and canonical hygiene are strong; deductions for missing famous-people content in this build, uncached dynamic rendering, blank no-JS 404, and bundle weight).
