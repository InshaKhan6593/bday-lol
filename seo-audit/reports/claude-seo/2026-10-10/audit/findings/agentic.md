# Agent readiness (seo-agentic) - http://localhost:3100

Audit date 2026-10-10. Target: production build of mybday.lol (pre-launch). Plugin claude-seo 2.4.0. Vendor facts last checked 2026-09-23 (17 days old, inside the 60-day window).

## Summary

- **Lighthouse Agentic Browsing: 2/2** (Lighthouse 13.5.0, mobile and desktop; ran locally, see below). Same 2/2 on `/october-7` (mobile) and `/claim` (mobile and desktop).
- **Agent-UX heuristic (0-100): unavailable.** The plugin's Playwright renderer could not load localhost (`net::ERR_FAILED`). Replaced by Lighthouse's `agent-accessibility-tree` audit (33 axe rules, pass on all pages tested) and a raw-HTML read.
- **P0 failures: 0.** One P0 not tested (WAF; localhost, and `--ua-matrix` not authorized).
- What most limits agents today: nothing measured is broken. What remains is optional discovery (llms.txt, Markdown, Content-Signal) and a policy decision on the paid claim form.

## Lighthouse Agentic Browsing

How it ran: `lighthouse_agentic.py --strategy both` (PSI v5) returned HTTP 429 for both strategies (shared daily quota exhausted, no Google API key configured). PSI also cannot reach `localhost`. So I ran Lighthouse 13.5.0 locally (`npx lighthouse@latest <url> --only-categories=agentic-browsing`, headless Chrome 154, `--preset=desktop` for desktop) and fed the JSON through `lighthouse_agentic.py --from-json`.

| Audit | `/` mobile | `/` desktop | `/october-7` mobile | `/claim` mobile | `/claim` desktop |
|---|---|---|---|---|---|
| agent-accessibility-tree (counted) | pass | pass | pass | pass | pass |
| cumulative-layout-shift (counted) | pass, CLS 0 | pass, 0 | pass, 0 | pass, 0 | pass, 0 |
| webmcp-form-coverage | N/A | N/A | N/A | N/A | N/A |
| webmcp-registered-tools | N/A | N/A | N/A | N/A | N/A |
| webmcp-schema-validity | N/A | N/A | N/A | N/A | N/A |
| llms-txt | N/A | N/A | N/A | N/A | N/A |
| ard-schema | N/A | N/A | N/A | N/A | N/A |
| **Fraction** | **2/2** | **2/2** | **2/2** | **2/2** | **2/2** |

Local-run caveat: CLS is from a lab load against a local production build, not field data. WebMCP audits depend on the testing browser, so N/A here is not a defect.

Paths that add a counted audit (options, not goals):
1. Publish a valid `/llms.txt` -> `llms-txt` becomes counted: 3/3.
2. Publish `/.well-known/ai-catalog.json` -> `ard-schema` becomes counted. Only worthwhile if there are agent resources (MCP server, A2A card, skills) to list; there are none now.
3. Annotate every form with `toolname`/`tooldescription` -> `webmcp-form-coverage` counts. Not recommended for the claim form (see F4).

## Access policy (robots.txt: one `User-agent: *` group, `Allow: /`, `Disallow: /api/ /admin /dev/ /styleguide`)

- **Training** (GPTBot, ClaudeBot, CCBot, plus control tokens Google-Extended and Applebot-Extended): allowed, all fall through to `*`. Matches the client's recorded decision (all AI crawlers allowed).
- **Search** (OAI-SearchBot, Claude-SearchBot, PerplexityBot): allowed via `*`.
- **User-triggered** (ChatGPT-User, Claude-User, Perplexity-User, Google-Agent): allowed via `*`. Per vendor docs Claude-User honours robots.txt; ChatGPT-User may not apply it; Perplexity-User and Google-Agent generally ignore it. So robots.txt is not an access control for this class.
- **WAF / bot protection: not tested.** Localhost has no WAF, and the UA matrix was not authorized. Re-test after launch behind the real CDN/WAF.

## Findings

Severity labels: Critical / High / Medium / Low / Info. Plugin priority in brackets.

### F1 - Info [P0 pass] Primary content is server-rendered
`agentic_check.py` server-rendered: 243 words without JS, no JS-shell marker. `/` has `<h1>October 10</h1>`, `<main>`, 3 `<nav>`, header, footer; `/october-7` has `<h1>Everyone celebrating October 7</h1>`. Agents that do not run JavaScript see the leaderboard content.

### F2 - Info [P0 pass] Accessibility tree and layout stability
Lighthouse `agent-accessibility-tree` passes on `/`, `/october-7`, `/claim` (no failing axe rules). `<html lang="en">`; the pages contain no `<img>` elements; icon-only buttons carry names (`aria-label="Open menu"`, `"Boost Jess"`, `"Add photo"`, `"Gifts are for adults only"`, 12 colour swatches with `aria-label` + `aria-pressed`). CLS is 0 everywhere tested.

### F3 - Info: Agent-UX score unavailable; the heuristic flags are false positives
`agent_ux_check.py` returned `score_status: unavailable` on all three URLs (Playwright `net::ERR_FAILED` on localhost). The HTML fallback (valid here because `server-rendered` passed) reports: `/` 7 buttons, 32 anchors, 10 landmarks, 0 div-onclick widgets, `inputs_without_aria: 1`; `/october-7` 2 buttons, 27 anchors, 8 landmarks; `/claim` 19 buttons, 20 anchors, 11 landmarks, `inputs_without_aria: 4`. The `inputs_without_aria` inputs are wrapped in a `<label class="bfn3sa_field">` (homepage email; claim bid, name, bio, email) rather than using `aria-label` or `for`/`id`. Wrapping is a valid accessible name and Lighthouse axe passed on the hydrated DOM, so I treat them as false positives. Fix to get a real score: re-run `agent_ux_check.py` against the deployed URL (or install Chromium via `/seo setup`).

### F4 - Low (opportunity) [P1 transactional / P2] No WebMCP tools; do not annotate the payment form
Evidence: `registerTool(` call sites 0; `document.modelContext` and `navigator.modelContext` unused; 1 form on `/` (email reminder) and 1 on `/claim` (`<form id="claim-form">`, submit "Pay & claim"); 0 forms with `toolname`/`tooldescription`. WebMCP is a W3C Community Group draft (WebKit opposes, Mozilla neutral; checked 2026-09-23), so absence is an opportunity.
Recommendation: wait until launch. If ever added, a read-only tool (look up who is #1 on a date, list a date's board) is the safe candidate. The claim form moves money, so an agent-callable tool would need a human confirmation step; do not declaratively annotate it. Confirm with `agentic_check.py` `webmcp-tools` and Lighthouse `webmcp-registered-tools`.

### F5 - Low [P1 info] Content-Signal not declared
Evidence: robots.txt has no `Content-Signal:` line. It is a draft preference, not enforcement, and Google says it does not act on it (checked 2026-09-23). Since the client allows all AI crawlers, adding a line only states the policy explicitly. The `ai-train` value is the client's choice, so I am not choosing it. Draft with `agentic_fix.py robots http://localhost:3100 --signal "search=yes, ai-input=yes, ai-train=<client decides>"` (adds a line to the `*` group, changes no Allow/Disallow).

### F6 - Low [P1] robots.txt Disallows are not protection for user-triggered agents
`Disallow: /api/`, `/admin`, `/dev/`, `/styleguide`: all return 404 on GET today (`/admin`, `/dev`, `/styleguide`, `/api`, `/api/health`), so nothing sensitive is exposed at those exact paths. Because Perplexity-User, Google-Agent and ChatGPT-User may ignore robots.txt, any non-public route (POST handlers under `/api`, admin tools) must rely on authentication and server-side validation, not the Disallow. I did not test the POST routes (read-only audit). Confirm with a code review of API route auth.

### F7 - Info (opportunity) [P1] No llms.txt
`/llms.txt` -> 404 (HTML 404 page, 10,467 bytes), `/llms-full.txt` -> 404. Lighthouse drops the audit (N/A). Publishing a valid file adds a counted pass (3/3). Google Search ignores llms.txt and no consumer agent is confirmed to read it. Draft with `agentic_fix.py llms http://localhost:3100` against the production origin: H1 `mybday.lol`, a `>` summary (a leaderboard where each of the 366 birthdays has a board and the top bid owns the homepage), and Markdown links to `/how-it-works`, `/terms`, `/privacy`, the 12 month pages and the sitemap rather than all 366 date pages. Recommended file only; not created.

### F8 - Info (opportunity) [P1] No Markdown delivery
`Accept: text/markdown` on `/` -> 200 `text/html`; `/index.md` -> 404; no `<link rel="alternate" type="text/markdown">`. Optional. If added, serve Markdown for the stable public pages (`/how-it-works`, month and date pages) with `Vary: Accept` and content equivalent to the HTML. The leaderboard changes with every bid, so Markdown must be generated from the same data source, not cached statically.

### F9 - Info [P2/P3] Discovery files absent, correctly
`/.well-known/ai-catalog.json`, `api-catalog`, `oauth-protected-resource`, `oauth-authorization-server`, `agent-card.json`, `ucp` -> all 404 (N/A in the plugin). There is no public API, OAuth service, A2A agent or commerce profile to advertise, so none is needed.

### F10 - Info [P1 pass] 404 behaviour is correct
Probe `/claude-seo-404-probe-24c5a53d` -> 404, no catch-all 200, so a future llms.txt or ai-catalog check will not be fooled by a soft 404.

### F11 - Info: P1 manual review not performed
Stable confirmation states, hover-only menus and focus traps need an interactive session. `/claim/success` and `/unsubscribe` return 200 (noindex, crawlable), but I did not complete a claim flow (it triggers payment). Not tested.

### F12 - Info: hidden native `<select>` duplicates are intentional
`/` and `/claim` contain visually-hidden `<select aria-hidden="true" tabindex="-1" name="month|day">` (Radix Select form fallback). The exposed controls are `role="combobox"` buttons. Lighthouse's tree audit passes, so no action. Re-check the comboboxes' names on the deployed site (Gift app has `aria-label="Gift app"`; Month and Day rely on visible label text, which axe accepted).

## Standards status (draft or proposal, checked 2026-09-23)
- WebMCP: W3C Community Group draft, not a standard.
- Content-Signal: Cloudflare Content Signals Policy plus IETF draft; a preference, not enforcement.
- ai-catalog.json / Agentic Resource Discovery 1.0: proposal, checked by Lighthouse 13.5 `ard-schema`.
- llms.txt: community spec; Lighthouse checks it, Google Search ignores it.
- Web Bot Auth: proposal; not relevant until a WAF is in front of the site.
- Nothing here is promised to affect ranking, citation or traffic.

## Recommendations (in order)
1. Re-run the Lighthouse and Agent-UX checks against the deployed origin (PSI with an API key via `/seo google setup`, or the local npx command) and test the WAF with `--ua-matrix` if the owner authorizes it. Confirms: `lighthouse_agentic.py` shows 2/2 or better; `waf-ua-matrix` passes.
2. Review auth on any non-GET `/api` routes (F6). Confirms: unauthenticated requests are rejected regardless of user agent.
3. Optional: publish llms.txt (F7), then Content-Signal once the client states a training stance (F5). Confirms: `llms-txt` pass in `agentic_check.py`, Lighthouse 3/3, `content-signal` pass.
4. Optional, later: Markdown for static pages (F8); a read-only WebMCP tool (F4).

## Structured findings (audit-data.json, AI Search Readiness)
```json
[
 {"title":"Lighthouse Agentic Browsing 2/2 (13.5.0, mobile and desktop, local run)","severity":"info","description":"agent-accessibility-tree and cumulative-layout-shift pass on /, /october-7, /claim; CLS 0. PSI returned 429 and cannot reach localhost, so Lighthouse ran locally.","recommendation":"Re-run against the deployed origin."},
 {"title":"Agent-UX heuristic unavailable","severity":"info","description":"Playwright renderer failed with net::ERR_FAILED on localhost; HTML fallback shows labelled inputs, named icon buttons and landmarks.","recommendation":"Re-run agent_ux_check.py on the deployed URL."},
 {"title":"No Content-Signal line in robots.txt","severity":"low","description":"Single * group allows all AI crawlers (client decision). Content-Signal is a draft preference.","recommendation":"Optionally add a Content-Signal line once the client chooses the ai-train value."},
 {"title":"Robots Disallow is not protection for user-triggered agents","severity":"low","description":"Perplexity-User, Google-Agent and ChatGPT-User may ignore robots.txt; /admin, /dev, /styleguide, /api return 404 on GET today.","recommendation":"Ensure non-GET /api routes enforce authentication and validation."},
 {"title":"No llms.txt, Markdown delivery or WebMCP","severity":"info","description":"/llms.txt 404; Accept: text/markdown returns HTML; no registerTool calls. All optional; llms.txt would make Lighthouse 3/3.","recommendation":"Optional: publish llms.txt at launch; keep the payment form out of WebMCP."}
]
```

## What works
- Server-rendered pages with real landmarks, one H1, labelled controls, named icon buttons.
- CLS 0 and a passing accessibility tree on the home, date and claim pages.
- Real 404s, a working sitemap (382 `<loc>` entries = 1 + 3 + 12 + 366), reachable robots.txt with a Sitemap line.
- A deliberate, documented AI-crawler policy.

## Category score: 90 / 100
Deductions: Agent-UX heuristic unverified and WAF untested (-5); no optional discovery layer or explicit Content-Signal (-5). This score is my own summary and is separate from the Lighthouse 2/2 fraction and from the unavailable Agent-UX 0-100 heuristic.
