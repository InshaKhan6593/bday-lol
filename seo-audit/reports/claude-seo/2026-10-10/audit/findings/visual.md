# Visual findings (seo-visual) - http://localhost:3100 - 2026-10-10

## Method and limits (read first)

- **No screenshots were captured.** The plugin's headless browser cannot load the local target:
  - `capture_screenshot.py http://localhost:3100/ --all` failed for desktop, laptop, tablet and mobile with `Page.goto: net::ERR_FAILED at http://localhost:3100/`.
  - `render_page.py http://localhost:3100/ --mode auto --a11y-tree --json` returned HTTP 200 from the raw fetch but `error: playwright error: Page.goto: net::ERR_FAILED`, with `accessibility_tree: null`, `render_engine: null`.
  - The server itself is fine (`curl` returns 200). `screenshots/` is therefore empty, and nothing below is a claim about how the page looks when rendered.
- **Analysis source:** raw server-rendered HTML for `/`, `/october-7` and `/october`, plus the four CSS bundles the pages link (design tokens, media queries, component rules). Contrast ratios and tap-target sizes are computed from the CSS tokens, not measured in a browser. Anything that needs a layout engine (overlap, wrapping, real tap-target boxes, layout shift, LCP element) is marked "not verified".
- No file in the repo was edited. The design is the client's mockup, so every design point below is a suggestion for the client, not a defect to fix in code.

## Scorecard

| Check | Result | Basis |
|---|---|---|
| Viewport meta | Pass | `<meta name="viewport" content="width=device-width, initial-scale=1"/>` on all three pages |
| H1 present, one per page | Pass | `/`: "October 10"; `/october-7`: "Everyone celebrating October 7"; `/october`: "October birthdays" |
| Primary CTA in the first screen (source order) | Pass on `/october-7`; likely on `/` (not verified) | Header has "Claim your birthday" pill on desktop and "Claim yours" pill on mobile. `/october-7` has the "Bid on October 7" button (`/claim?date=october-7`) right after the H1 block. On `/`, the large "Claim the top spot" bar comes after the owner card, gift panel and share panel, so on short viewports it is probably below the fold (not verified) |
| Mobile navigation | Pass | Desktop nav hidden at `max-width:640px`; mobile shows a "Claim yours" pill plus a menu button |
| Base font size | Pass | `body` 17px (`--text-body`), lead copy 19px. Above the 16px guideline |
| No horizontal scroll | Likely pass (not verified) | `overflow-x:clip` is set, `body{overflow-wrap:anywhere}`, no fixed pixel widths found on the main containers, grid uses `minmax(0,1fr)` |
| Images | Pass | Zero `<img>` elements on all three pages; icons are inline SVG with `aria-hidden="true"`; avatars are initials. No image-alt, image-size or CLS-from-image issues are possible |
| Colour contrast (computed) | Pass | Ink `#141414` on home ground `#E4F5A1`: 15.7:1. Ink on pink accent `#FF7AB8`: 7.7:1. Secondary text `#333` on ground: 10.8:1. Tertiary `#4a4a4a` on white: 8.9:1. Error `#b3132b` on white: 6.9:1. All beat 4.5:1 |
| Focus visibility | Pass | `:focus-visible{outline:3px solid #141414;outline-offset:2px}` on interactive components |
| Reduced motion | Pass | `@media (prefers-reduced-motion:reduce)` is present |
| Landmarks | Pass | `header`, `nav[aria-label=Main]`, `main`, `nav[aria-label="Birthdays by month"]`, `nav[aria-label=Footer]`, `footer`; month page adds `nav[aria-label="Other months"]`; date page adds `nav[aria-label="Nearby dates"]` |
| Forms | Pass | Reminder form on `/`: every control sits inside a `<label>` (Month, Day, Email); email input has `type=email`, `autocomplete=email`, `required` |
| Accessibility tree | Not captured | Plugin returned `accessibility_tree: null`; the HTML-derived outline above stands in for it |

## Above-the-fold (from source order and CSS, not rendered)

- `/` desktop: logo and nav, then kicker "Today's birthday belongs to" and H1 "October 10", then the white owner card (Jess Moreno, bio, Boost button). The page is clearly hero-led. Which of the gift panel or the "Is today your birthday too? Own today for $241 / Claim the top spot" bar lands in the first 1080px depends on real heights (not verified).
- `/` mobile: the "Claim yours" pill stays in the header, so a claim action is reachable without scrolling regardless of body order.
- `/october-7` desktop and mobile: date stepper (Previous day, Pick a date, Next day, Back to today), H1, status line, then the ink-coloured "Own the top spot / Bid on October 7" card. Strong: the primary action is the first block after the H1.
- `/october`: H1, intro paragraph, then a calendar card ("Top bid on every October date", 31 cells), then the 31-row list. All 31 dates are crawlable links twice (calendar cell and list row).

## Findings

### F1 - Medium - Home page claim bar sits below the owner card, gift panel and share panel
- Evidence: in the home HTML the order inside `<main>` is hero H1, owner card with Boost, gift panel (Venmo, Cash App), share panel (Share, Facebook, Text, Copy link), and only then the `_06co2W_claimBar` ("Is today your birthday too? Own today for $241 ... Claim the top spot"). Header pill "Claim your birthday" exists on desktop, "Claim yours" on mobile.
- Why it matters: it is the paid action the business depends on. Whether it is above the fold on a 1366x768 laptop or 375x812 phone needs a real render (not verified here).
- Suggestion for the client (mockup is the authority, no code change): consider a claim button visible in the first viewport on mobile, or confirm the header pill is intended to carry that role.

### F2 - Low - "Label in name" mismatch on the month calendar cells (WCAG 2.5.3)
- Evidence on `/october`: `<a aria-label="October 1, unclaimed" ...><span>1</span><span>open</span></a>`. The visible text is "1 open"; the accessible name is "October 1, unclaimed". "open" is not in the name, so voice-control users saying "click open" or "click 1 open" will not match.
- Fix: make the accessible name start with or contain the visible text, for example `aria-label="1 open, October 1"` or drop `aria-label` and give the visible number a visually-hidden "October" prefix. No visual change.

### F3 - Low - No "skip to main content" link
- Evidence: zero matches for "Skip to" in `/`; `<main>` has no `id`. Keyboard users tab through the logo and nav on every page before the content (3 to 4 stops on `/`, fewer on date pages).
- Fix: add a visually-hidden-until-focused skip link as the first element in `<body>` and an `id` on `<main>`. Invisible to the mockup.

### F4 - Low - Footer month links and footer text links have small touch targets
- Evidence: `.lWai2a_months a{padding:4px 0}` at 15px font and line-height 1.35 gives roughly 28px tall (about 25px wide for "Jan") with a 16px gap; `.lWai2a_links a{padding:6px 0}` gives roughly 32px tall. Header controls are 44px (`--control-sm`) and buttons 48 to 56px, which is fine.
- Pass for WCAG 2.2 AA (24px minimum), below the 44 to 48px comfort target. Estimated from CSS, not measured.
- Suggestion for the client: slightly larger vertical padding on the footer links on mobile.

### F5 - Low - Smallest text is 11 to 13px in a few places
- Evidence: `--text-micro: 11px` is used by `.vxSvRq_cellSub` (the "open" and bid sublabel under each calendar date on month pages); 12px by badges and the "today" tag; 13px by the source line, fact keys, rank and "held" text on date pages. Contrast on these is high, so legibility is mostly a size question. Not used for primary content.
- Suggestion for the client: consider 12px minimum for the calendar sublabels if testing on small phones shows strain.

### F6 - Low - `aria-controls` on the menu button points to an id that does not exist while the menu is closed
- Evidence: `<button aria-label="Open menu" aria-expanded="false" aria-controls="_R_19btb_">`; the id `_R_19btb_` appears only on the button itself in the SSR HTML. The panel (`.JMfsBq_menuPanel`) is rendered only when open. Assistive tech ignores a dangling reference, so impact is small.
- Fix: render the panel container always (hidden) or omit `aria-controls` until open.

### F7 - Info - Date page H1 for an unclaimed date reads "Everyone celebrating October 7"
- Evidence: `/october-7` is unclaimed ("Nobody has claimed October 7 yet"), yet the H1 says everyone is celebrating. This is client mockup copy shared by all 366 pages (see known decisions: board copy repeats). Suggestion for the client only: an unclaimed-state heading such as "October 7 is up for grabs" would match the content.

### F8 - Info - Countdown is server-rendered with a fixed value
- Evidence: `<time class="_06co2W_countdown" dateTime="2026-10-11T04:00:00.000Z">17:49:59</time>`, and the server passes `serverNow` to the client component, so it ticks after hydration. The `<time>` element is not an `aria-live` region, so screen readers are not spammed (only the "Copy link" label has `aria-live="polite"`). No action.

### F9 - Info - Items that need a real browser (not verified)
Overlap or wrapping of the header at 375px (logo 24px plus "Claim yours" pill plus 44px menu button in one non-wrapping row, `flex-wrap:nowrap`), the 7-column calendar at 375px (about 41px per cell, `min-height:52px`), the stepper grid on date pages at 375px, real CLS and LCP. Re-run `capture_screenshot.py` against a deployed URL, or run a one-off Playwright script outside the plugin if the plugin cannot be pointed at localhost.

## What works

- Design system is token-driven and consistent: one set of control sizes (44, 48, 52, 56px), radii, 3px ink strokes and offset shadows, shared by all pages.
- No raster images on the audited pages, so no image weight, alt-text, or layout-shift-by-image risk; icons are decorative SVG with `aria-hidden`.
- Strong contrast across the board (lowest computed 6.8:1), visible 3px focus outlines, reduced-motion support.
- Correct landmark structure with distinct accessible names for each `nav`; one H1 per page; sensible heading order (H1, H2, H3) on the pages checked.
- Mobile-first handling is present in the CSS: 16 `@media (max-width:640px)` or 600px rules, a dedicated mobile header with menu button, grids that collapse, 17px base text.
- Date, month and home pages ship server-rendered, so content is visible without JavaScript.

## Category score: 82 / 100

Capped because no rendered evidence could be collected (browser refused localhost). Source-level accessibility and responsiveness hygiene is strong; deductions are for the unverified above-the-fold claim path on the home page (F1) and a handful of small accessibility polish items (F2 to F6). Re-score after a rendered pass on the deployed site.
