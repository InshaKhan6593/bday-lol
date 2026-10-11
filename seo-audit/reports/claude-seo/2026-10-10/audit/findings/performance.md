# Performance findings - http://localhost:3100 (production build)

Agent: seo-performance. Date: 2026-10-10. Pages: `/`, `/october-7`, `/october` (plus headers for `/how-it-works`, `/terms`, `/privacy`, OG image, icons, sitemap).

**Read this first.** All numbers are lab data from a local `next start` on a Windows machine. There is no CrUX/field data, no CDN, no HTTPS/HTTP2 and no real network. Local TTFB (10-95 ms) says nothing about Vercel. Lighthouse's throttled-mobile numbers (simulated Slow 4G, 4x CPU) are the only network-shaped signal, and they come from a single run. PSI could not be used (localhost is unreachable from PSI; the plugin call also returned a rate-limit error). Lighthouse 13.5.0 (mobile preset, performance category only) was run locally with Chrome via `npx lighthouse`.

## Scores and Core Web Vitals proxies (Lighthouse 13.5.0, mobile, simulated throttling)

| Page | Perf score | FCP | LCP | TBT (INP proxy) | CLS | TTFB (doc) | DOM nodes |
|---|---|---|---|---|---|---|---|
| `/` | 94 | 1.1 s | 3.0 s (needs improvement, >2.5 s) | 80 ms | 0 | 40 ms | 233 |
| `/october-7` | 95 | 0.9 s | 3.0 s (needs improvement) | 50 ms | 0 | 30 ms | 113 |
| `/october` | 95 | 0.9 s | 2.9 s (needs improvement) | 50 ms | 0 | 90 ms | 390 |

CWV status (lab only, not a pass/fail verdict): LCP borderline-fail in the throttled lab, INP proxy (TBT) good, CLS good. INP cannot be measured without real interaction; TBT of 50-80 ms and a small DOM suggest low risk.

Measured TTFB with curl (15 requests each, gzip, local): `/` median 32 ms (p90 48), `/october-7` median 20 ms, `/october` median 24 ms, `/how-it-works` median 10 ms. Not representative of Vercel (cold serverless starts plus a Postgres round trip on every view will be larger).

## Page weight

| | `/` | `/october-7` | `/october` |
|---|---|---|---|
| HTML raw / gzip | 46,065 B / 11,334 B | 32,523 B / 8,240 B | 76,337 B / 10,442 B |
| Of which inline RSC flight scripts | ~24.7 KB | ~20.2 KB | ~53.3 KB |
| CSS files (render-blocking) | 4 (67 KB raw / ~12.6 KB gz) | 3 (61 KB raw / ~11.3 KB gz) | 3 (same as date) |
| JS executed (async chunks, excl. noModule) | 10 files, 626 KB raw / 191 KB gz | 10 files, 663 KB raw / 203 KB gz | 10 files, same family |
| Font | 1 woff2, 76.9 KB | same | same |
| Images (`<img>`) | 0 | 0 | 0 |
| Lighthouse total transfer | 303 KiB | 319 KiB | 359 KiB |

JS chunk map (raw / gzip): framework+React `2zv3...` 230 KB / 72 KB; Next client router `06i_...` 163 KB / 45 KB; Radix UI (Popper, DismissableLayer, FocusScope, floating-ui) `29iw...` 144 KB / 46 KB; `1ppf...` 34 KB / 8.7 KB; route chunks 5-38 KB each. A further 112 KB (`0cz1...`, `noModule`) is a legacy-browser fallback that modern browsers do not download.

## What works

- Zero images on all three pages, so no image LCP, no image-dimension CLS, no hero-weight problem. LCP is text (`/october-7`: `<h1 class="vxSvRq_h1">` "Everyone celebrating October 7"; `/`: the owner bio `<p class="_06co2W_ownerBio">`; `/october`: the intro `<p>`).
- CLS is 0 on all three pages. The page background is set inline (`<style>html,body{background-color:#E4F5A1}`), so there is no colour flash.
- Font handling is correct: `next/font/google` Bricolage Grotesque, `display: swap`, latin subset preloaded by a `Link: ...woff2; rel=preload; as="font"; crossorigin` header, plus a metric-adjusted fallback (`size-adjust:105.43%`, ascent/descent overrides). Lighthouse font-display and CLS-culprit insights both pass.
- Static assets are `Cache-Control: public, max-age=31536000, immutable` (JS, CSS, fonts); gzip is on for HTML and assets.
- Server HTML is complete (no client-side render step), no third-party scripts, no external origins at all (Lighthouse: no preconnect candidates, the network dependency chain is the single document).
- No long tasks of concern: TBT 50-80 ms, main thread work 0.8 s throttled, bootup 0.35 s.
- Small DOMs (113-390 nodes vs the 1,500 guideline).

## Findings

### 1. Medium - Every HTML page is rendered per request and sent `no-store`, so Vercel's CDN cannot cache any of them
Evidence: all of `/`, `/october-7`, `/october`, `/how-it-works`, `/terms`, `/privacy`, `/claim` return `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`. The homepage and date page call `await connection()` (`web/src/app/page.tsx`; `web/src/app/[slug]/page.tsx` lines 53 and 65). The homepage is documented as "Rendered per request: it changes with every bid and at midnight ET". `06-seo.md` line 12 calls for ISR (revalidate of a few minutes plus on-demand revalidation after payments) instead. Static-content pages (`/how-it-works` 10 ms, `/terms`, `/privacy`) are also `no-store`; I did not trace why they are dynamic (the shared header calls `now()` and the theme wrapper may be involved).
Impact on the live site: every visitor and every crawler hit becomes a serverless invocation plus a Postgres query, so production TTFB will be set by cold starts and DB latency, not by the 20-50 ms seen locally. Googlebot will crawl 366 date pages and 12 month pages, which also loads the database.
Fix: for `/how-it-works`, `/terms`, `/privacy` and the month pages use static or ISR rendering (`export const revalidate = 3600` or similar). For date pages and the homepage, move the "now" and board data behind a cached fetch with a short `revalidate` (60-300 s) and call `revalidateTag`/`revalidatePath` from the Stripe webhook after a paid bid; keep the live countdown on the client (it already ticks from `serverNow`). Re-measure TTFB on a Vercel preview.

### 2. Medium - Simulated mobile LCP is 2.9-3.0 s (limit 2.5 s); the delay is render-blocking CSS and font, not the server
Evidence: Lighthouse LCP breakdown on `/october-7`: TTFB 29 ms + element render delay 217 ms observed; on `/` TTFB 40 ms + render delay 1,092 ms; on `/october` TTFB 95 ms + render delay 1,104 ms. The render-blocking insight (score 0) lists 3-4 stylesheets with estimated waste of 156-456 ms each, e.g. `0jyd9euxzmpam.css` (9.6 KB transfer) 456 ms on `/`. The 77 KB font is fetched at the same time and the LCP text paints after the CSS completes. Lab LCP scores 0.78-0.81.
Fix (in order of effect): (a) cut CSS blocking time by reducing the shared stylesheet (finding 3) and merge or inline the home-only stylesheet (`38hefpq7oxpgw.css`, 1.9 KB); (b) consider inlining the small critical CSS (`experimental.inlineCss` in Next) so first paint does not wait for 3-4 requests; (c) check the font axis choice (finding 5). Do not treat the 3.0 s as a field result: with HTTP/2 on Vercel and a real CDN the CSS wait will be shorter. Confirm with CrUX after launch.

### 3. Low - One shared 55.7 KB (9 KB gz) CSS chunk carries every page's CSS modules
Evidence: `0jyd9euxzmpam.css` contains 389 CSS-module class selectors (for example the How it works `pRa61a_steps/faq` rules) while the homepage HTML uses about 49 of them, `/october-7` about 62, `/october` about 58 (substring match against the served HTML, approximate). Lighthouse unused-css-rules passes, because the rules are used elsewhere on the site, so this is a bundling-granularity note rather than a failure.
Fix: low priority. If finding 2 needs more headroom, check whether Turbopack's CSS chunking can be split per route (or inline the per-route CSS), and avoid importing unrelated module CSS from shared components.

### 4. Low - 191-203 KB gz of JavaScript on pages that are mostly static text; the Radix chunk loads everywhere and is about half unused
Evidence: Lighthouse unused-javascript: `2zv3...` 36-42% unused (framework), `29iw...` (Radix) 49-63% unused, total est. savings 48-58 KiB. Radix is imported by `BoostDialog`, `DateNav`, `GiftMenu`, `ShareMenu`, `Menu`, `Select`; the Radix chunk is requested on `/`, `/october-7` and `/october`. TBT is still only 50-80 ms, so this is a hygiene item and a small INP risk on low-end phones, not a current problem.
Fix: lazy-load the dialog and menus that open on interaction (`next/dynamic` for `BoostDialog`, `ShareMenu`, `GiftMenu`, and the `DateNav` popover) so the Radix/floating-ui code is fetched on first use; or import Radix primitives individually for better tree-shaking.

### 5. Low - Font is a 77 KB variable woff2 (weights 200-800, opsz axis) for a design that uses 400/600/700/800
Evidence: `@font-face ... font-weight:200 800; font-stretch:100%`, `tokens.css` weights 400, 600, 700, 800; file `2aa781f449db21e3-s.p.1pg2nifvadz06.woff2`, `Content-Length: 76868`, preloaded on every page. Only the latin subset is preloaded; the extended subsets are lazy via unicode-range (good).
Fix: optional. Check whether the `opsz` axis is needed visually (`axes: ["opsz"]` in `web/src/app/layout.tsx`); dropping it, or self-hosting a static subset of 2-3 weights, could cut tens of KB from the critical path. Verify against the mockup before changing anything, since the UI must stay pixel-matched.

### 6. Low - Share images (OG) and icons are revalidated on every fetch
Evidence: `/opengraph-image` 55,555 B PNG, TTFB ~97 ms; `/october-7/opengraph-image` 55,759 B, TTFB ~99 ms; `/icon` 5.4 KB; `/apple-icon` 5.0 KB. All send `Cache-Control: public, max-age=0, must-revalidate`. Sizes are fine for social cards.
Fix: on Vercel generated image routes are cached at the edge, so this is probably fine; verify on a preview. If not, add a longer `s-maxage` for the OG and icon routes, since date-page OG images change rarely.

### 7. Info - Month page HTML is 76 KB raw, 70% of it inline RSC payload
Evidence: `/october` has ~53 KB of `self.__next_f.push` inline script out of 76 KB HTML; gzip brings the document to 10.4 KB, so the real cost is small. The date entries are serialized twice (HTML and flight data). No action needed unless the month page grows.

### 8. Info - Legacy-JS polyfills (14 KB) are inside the Next/React runtime chunk
Evidence: the legacy-javascript insight points at `2zv3...js` (`Array.prototype.at`, `Array.prototype.flat`). This is framework code, not site code. Optionally set a modern `browserslist` and re-measure; expect little gain.

### 9. Info - Not covered
No field data, no CDN/HTTP2/Brotli measurement, no INP measurement, no test of `/claim` (photo picker and Stripe flow, noindex), no cold-start measurement. The homepage also issues two `/claim?_rsc=` prefetches about 1.1 s after load; harmless.

## Recommended priority
1. Make the content pages cacheable on Vercel (finding 1) and re-test TTFB and LCP on a preview deployment.
2. Trim render-blocking CSS and consider inlining critical CSS (findings 2, 3).
3. Lazy-load the Radix-based interactive pieces (finding 4).
4. Revisit the font axes only if LCP still sits above 2.5 s in field data (finding 5).

## Category score: 84 / 100
Strong fundamentals (no images, CLS 0, correct font setup, immutable asset caching, tiny DOM, no third parties, Lighthouse 94-95), held back by a lab LCP of 2.9-3.0 s from render-blocking CSS, a heavy-ish JS payload for static pages, and no CDN-cacheable HTML for production.

Structured findings (for audit-data.json, category Performance):

```json
{"category":"Performance","score":84,"findings":[
{"severity":"Medium","title":"All HTML is no-store and rendered per request","evidence":"Cache-Control: private, no-cache, no-store on /, /october-7, /october, /how-it-works, /terms, /privacy"},
{"severity":"Medium","title":"Simulated mobile LCP 2.9-3.0 s","evidence":"Lighthouse 13.5.0: LCP 2975/3007/2872 ms; render-blocking CSS est. 156-456 ms"},
{"severity":"Low","title":"Shared 55.7 KB CSS chunk with 389 module classes, 49-62 used per page","evidence":"0jyd9euxzmpam.css"},
{"severity":"Low","title":"191-203 KB gz JS; Radix chunk 46 KB gz, ~50-60% unused, on every page","evidence":"unused-javascript est. 48-58 KiB"},
{"severity":"Low","title":"77 KB variable font preloaded","evidence":"2aa781f449db21e3-s.p...woff2"},
{"severity":"Low","title":"OG/icon routes use max-age=0 must-revalidate","evidence":"55 KB PNG, ~97 ms TTFB locally"},
{"severity":"Info","title":"Local lab only, no field data","evidence":"no CrUX, no CDN, no HTTPS"}]}
```
