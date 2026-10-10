# mybday.lol: birthday leaderboard (client project)

**Read this first.** This folder holds the full brief for a client build (the `.md` files) and the app itself (`web/`).
The foundation is built and runs locally: database schema, date rules with tests, the design system and seed data.
Every page in the mockup is built. Claims and boosts are paid for through Stripe Checkout (test mode locally), and all 8 emails send (Mailpit locally, Resend in production). Next up is SEO (step 9).

> **Handoff v2 (2026-10-10).** The client sent an updated mockup and developer notes: the site is now **mybday.lol**,
> with personal links, a reworked Claim form, Terms/Privacy pages and more. It's built (see the
> [Handoff v2](#handoff-v2-2026-10-10) section). Where it's the source of truth, it beats the older docs below.
> Points where the notes and the mockup disagree were kept as they were and are listed in [07 section D](07-open-questions.md#d-handoff-v2-points-to-confirm-with-the-client).

## One-paragraph summary

bday.lol works like outbid.lol: you pay to take the top spot, and anyone can outbid you. The difference is that it's built around **birthdays**.
Each of the 366 calendar dates (Feb 29 included) is its own leaderboard. People pay (min $5) to put
themselves or a friend on a date's list. The highest **total** for **today's** date owns the homepage.
Anyone can push anyone up with paid **boosts** (min $2). Friends send birthday gifts through the
person's own Venmo, Cash App, Amazon wishlist or Throne links, and that money never touches us. Boards reset every
year. The site also includes 366 SEO date pages, 12 month pages, transactional emails through Resend,
payments through Stripe Checkout (Adaptive Pricing, settled in USD) and a hidden admin view.

## Project at a glance

| | |
|---|---|
| Timeline | **14 days** (about 12 days of build and self-testing, then client review and revisions) |
| Stack required by client | **Next.js**. UI must match the mockup **pixel for pixel**, desktop and mobile |
| Integrations required | Stripe Checkout (Adaptive Pricing), Resend (email), Wikidata + Wikipedia pageviews, FiveThirtyEight US births data, Google Search Console |
| Status (2026-10-09) | Build foundation done locally (see [Build progress](#build-progress)) |

> **Private material is not in this repo.** The client's identity, the deal, his chat, spec doc and mockup source
> live only on the developer's machine (`private/`, `resources/`, `01-client-and-deal.md`, all git-ignored).

## Files in this folder

| File | What's in it |
|---|---|
| `01-client-and-deal.md` | *(local only)* Chat history condensed: scope changes, price and timeline, and the client's answers |
| [02-product-spec.md](02-product-spec.md) | **The consolidated requirements**: concept, bidding, yearly reset, boosting, gifts, colors, emails, sharing, admin, build note, not-in-v1 |
| [03-pages-and-ui.md](03-pages-and-ui.md) | Screen-by-screen spec taken from the mockup source: every section, exact copy, dynamic text formulas, desktop vs mobile |
| [04-design-system.md](04-design-system.md) | Font, the 12 color themes (hex), borders, radii, shadows, hover and press behavior, layout widths |
| [05-business-logic.md](05-business-logic.md) | Exact rules and formulas: min bids, ranking, boost math, next-occurrence and leap years, Eastern Time, email throttling |
| [06-seo.md](06-seo.md) | Date and month pages, metadata, OG images, the "About [date] birthdays" section and its data sources |
| [07-open-questions.md](07-open-questions.md) | Gaps and conflicts, **with our decisions**. Section C + the draft message at the bottom are what still needs the client |
| [08-emails.md](08-emails.md) | The 8 emails: research on what good ones say, the design, and each email's subject, preview line and content |
| [web/](web/) | **The Next.js app.** Setup, commands and folder map in [web/README.md](web/README.md) |
| `resources/` | *(local only)* Original material from the client (see below) |

### resources/ (local only)

- `client-spec-google-doc.txt`: the client's Google Doc, **verbatim** (downloaded 2026-10-09). This is the source of truth for behavior.
- `chat-transcript.md`: the Fiverr chat.
- `mockup-source/`: the **complete source of the client's clickable mockup** (Claude artifact "Birthday Bid Mockup").
  Every screen is a `*.dc.html` file: HTML with inline styles plus a small `class Component` script holding the demo logic and copy.
  **Use these files for pixel-exact values** (sizes, colors, spacing, copy). `canvas.json` lists the boards and their sizes.

## Source links

The client's Google Doc and clickable mockup links are in `private/README.md` (local only). Inspiration: https://outbid.lol/

## Priority of sources when they disagree

1. The client's latest chat messages (e.g. the yearly-reset and Feb 29 rules, and the SEO list)
2. The Google Doc (`resources/client-spec-google-doc.txt`)
3. The mockup (exact visuals and copy; its data and names are fake demo data)

Known conflicts are listed in [07-open-questions.md](07-open-questions.md).

## Build progress

**Stack:** Next.js 16 (App Router) + TypeScript, Postgres via Drizzle ORM, CSS Modules on design tokens,
Radix UI (dropdowns and popups), Phosphor icons, Vitest. Local services run in Docker (Postgres on :5440,
Mailpit on :8030). Production plan: Vercel Pro + Supabase (Postgres + Storage for photos, decided 2026-10-10 to match the Privacy Policy) + Stripe Checkout + Resend.

| Step | Status |
|---|---|
| 1. Local setup (Next.js, Docker Postgres + Mailpit, Drizzle, fake clock `DEV_NOW`) | ✅ Done |
| 2. Database schema: board_types → boards → entries → payments, leader_log, alerts, reminders, emails, famous people | ✅ Done (`web/src/db/schema.ts`, migration `web/drizzle/0000_init.sql`) |
| 3. Date rules: Eastern Time, leap years, which year's board is open, open/close times | ✅ Done (`web/src/lib/birthday.ts`) |
| Design system: tokens + UI components, dev-only style guide at `/styleguide` | ✅ Done |
| 4. Seed data: the mockup's demo people on today's real date | ✅ Done (`pnpm db:seed`) |
| 5a. Homepage from live data (desktop + mobile, #1 card, nobody-yet state, Boost box, countdown, Coming up, reminder signup) | ✅ Done (`web/src/app/page.tsx`, `web/src/components/home/`) |
| 5b. Date page from live data (`/october-7`: date picker with top bids, ranked list, held lines, search, claim-this-rank, Boost box, gift menu, About facts; `/oct-7` redirects) | ✅ Done (`web/src/app/[slug]/page.tsx`, `web/src/components/date/`) |
| 5c. How it works (`/how-it-works`: 3 steps, FAQ accordion with FAQPage structured data, "Find your date" bar) | ✅ Done (`web/src/app/how-it-works/page.tsx`, copy in `web/src/lib/how-it-works.ts`) |
| 5c. Claim (`/claim?date=october-7&rank=2`: date + bid with the leader box, B23 low-bid error, photo cropped to 512px in the browser, gift-link detection by real host, 12 color swatches that recolor the page, preview card; "Pay & claim" waits for step 6) | ✅ Done (`web/src/app/claim/page.tsx`, `web/src/components/claim/`, rules in `web/src/lib/claim.ts`) |
| 5c. Success (`/claim/success?session_id=cs_…`: reads the real result from the DB, copy variants for today's #1 / a later date's #1 / rank 2+ (07 B1, B6), "Finishing up…" polling until the webhook lands, shared-link card) | ✅ Done (`web/src/app/claim/success/page.tsx`, `web/src/components/success/`, `web/src/lib/success.ts`, `web/src/server/claim-result.ts`) |
| 6. Money path: claim → Stripe Checkout (USD + Adaptive Pricing, 30-min sessions) → signed webhook → entry live in a board-locked transaction (idempotent, #1 log updated) → Success page | ✅ Done for claims (`web/src/server/actions/claim.ts`, `web/src/server/claims.ts`, `web/src/app/api/stripe/webhook/route.ts`). Boost payments come with step 7 |
| 7. Boosts, #1 log and outbid alerts (Boost box → Stripe → total + #1 log; "Email me if X gets passed" list; alerts queued for the passed #1 + their list, ≤1 per person per 15 min, none after the day ends; email deep link opens the Boost box pre-filled; "Today ends in 12 min" warning) | ✅ Done (`web/src/server/actions/boost.ts`, `web/src/server/payments.ts`, `web/src/server/outbid.ts`) |
| 8. The 8 emails: designed in the app's look, sent once each (dedupe log), receipts + admin alert from the Stripe webhook, outbid alerts within seconds, a cron every minute for the hourly boost digest, "Your day is here" (8 AM ET) and reminders (a week before; claimers auto-added), signed unsubscribe page + one-click | ✅ Done (`web/src/lib/email-templates.ts`, `web/src/server/email/`, `web/src/app/api/cron/emails/route.ts`, `web/src/app/unsubscribe/`) |
| 8b. Child listings (07 D4): `is_minor` flag + "This is my child (under 18)" checkbox on Claim (first name only, gift links locked), server check, no gift menu / "Gifts open" pill / homepage gift panel for children, your-day email + admin alert wording, tests. Also decide: hide "Gifts open" for any listing with no gift links | ⏭️ Next (before step 9) |
| 9. SEO: month pages, About section data, OG images, sitemap | ⬜ |
| 10. Admin | ⬜ |
| 11. Deploy to Vercel + Supabase, test live | ⬜ |

**Tests:** every feature ships with tests (`pnpm test`, 215 so far): pure rules in `web/src/lib/*.test.ts` and
database tests in `*.db.test.ts`, which run against the local Docker Postgres inside a rolled-back transaction.

## Handoff v2 (2026-10-10)

Source: `resources/handoff-v2/` (local only): `DEVELOPER-NOTES.md`, `mockup/*.dc.html`, `screenshots/`, `legal/`.
The social ad boards are gone (07 C3 settled: out of scope). Built on branch `handoff-v2`:

| Area | What changed |
|---|---|
| Brand and wording | **mybday.lol** everywhere (UI, emails, checkout). A date's leaderboard is a "board" (never "list"), a claim is a "spot", "friends and followers". Status lines "Ends in…" / "Bidding is open" |
| Every page | Footer "© 2026 mybday.lol · FAQ · Terms · Privacy". New mobile menu (Today's birthday, Find your birthday, How it works & FAQ, Claim). Pages open at the top after Back/refresh |
| Date page | "Outrank Jess for $241"; the bar shows where you land with ties ("Bid $6 or more to move up to #20"). Phones: tap a card for an in-card Outrank button. Row share menu (Share…, Facebook, Text, Copy link). 20 people, then "Show 20 more". Short month names in the phone's bottom links, About facts one per row |
| Personal links | `/october-7/sam-rivera` (slug set when the payment lands, -2 for duplicates): scrolls to and highlights the person with a "You followed Sam's link…" banner. Used by row share menus, emails and the Success page |
| Claim | Gift links are app + username rows (one per app, up to 4; links built from the username). Name required. Date starts blank; fixed $ bid box; starts on Sky; under-18 tooltip. Stripe Checkout requires "I'm 18 or older and agree to the Terms…" (claims and boosts) |
| Success | "Your personal link" box with Copy / "Copied!" and "See your spot →". "You're #3 on October 7. Boost to climb." The link card shows the claimer's own link |
| Terms / Privacy | `/terms`, `/privacy` with the client's final text, read from the `site_pages` table first so the admin can edit them live |

Still to do from the handoff, in later steps: OG image for every personal link (step 9), editing Terms/Privacy/FAQ
and hiding listings in the admin (step 10), privacy-friendly analytics (named in the Privacy Policy) and the live
Stripe account's Terms URL (step 11), and testing Venmo/Cash App links on a real phone.

**Design decisions** (details in [04-design-system.md](04-design-system.md#implementation-decisions)): keep the client's look exactly
(rounded pastel shapes, Bricolage Grotesque); upgrade the mockup's hand-drawn icons to Phosphor Bold; build
dropdowns and popups on Radix UI because native `<select>` lists can't be styled.
