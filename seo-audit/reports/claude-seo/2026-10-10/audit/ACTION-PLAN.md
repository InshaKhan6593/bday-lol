# Action plan: mybday.lol SEO (after the claude-seo audit)

From [FULL-AUDIT-REPORT.md](FULL-AUDIT-REPORT.md) and the single-page reports one folder up. Nothing here blocks
indexing, so there are no Critical items. "Client" means it changes his design or copy and needs his OK first.

## Already fixed during the audit

Adult performers on 30 date pages, people listed on two dates, "footballer" next to "soccer player", cut-off
"middle-" labels, February naming the wrong rarest date, and January 1 never refreshing. All in code with tests
(290 pass), data refreshed for all 366 dates, verified in the database: 0 of each left.

## Phase 1: before launch, ours to do (High)

**Status 2026-10-12:** 1, 2, 3 (as a description list, not a sentence) and 4 are done. For 1, the homepage and date
pages are saved copies too, one per Eastern day, thrown away when a board changes. 5 is done on the test database.
`X-Powered-By` (item 7) is removed. Details in `06-seo.md`, "After the claude-seo plugin audit".

| # | Fix | Where | Effort |
|---|---|---|---|
| 1 | Make pages cacheable: static/ISR for How it works, Terms, Privacy and month pages; short revalidate + `revalidateTag` from the Stripe webhook for date pages and the homepage | `web/src/app/**/page.tsx`, `server/payments.ts` | 0.5–1 day |
| 2 | Server-rendered 404 page (message, links, `lang`) | `web/src/app/not-found.tsx` | 1 hour |
| 3 | One sentence with sign, birthstone and flower in the date page's About paragraph | `web/src/lib/about.ts` | 1 hour |
| 4 | `dateModified` in WebPage / CollectionPage JSON-LD, from the sitemap's lastmod; move lastmod only when a list or board really changes | `web/src/lib/seo.ts`, `server/famous.ts` | 2 hours |
| 5 | Backfill famous people for all 12 months on the production database before launch (the cron does one month a day) | deploy checklist | 1 hour, unattended |

## Phase 2: before launch, small polish (Medium / Low)

| # | Fix | Effort |
|---|---|---|
| 6 | Lazy-load the Boost, Share and Gift menus and the date picker so content pages don't ship Radix (about 240 KB gzipped today, mobile LCP 3.0 s in the lab) | 0.5 day |
| 7 | Remove `X-Powered-By`; share image for Terms and Privacy; stable WebSite description on the homepage; BreadcrumbList on How it works / Terms / Privacy | 2 hours |
| 8 | Skip link, `aria-label` that contains the visible text on calendar cells, menu button `aria-controls` | 1 hour |
| 9 | `llms.txt` (makes Lighthouse Agentic Browsing 3/3) | 30 min |
| 10 | Delete `web/public/_icon-options.html` once the share-icon decision is made | 1 min |

## Phase 3: needs the client (ask in one message)

| # | Question | Our recommendation |
|---|---|---|
| A | "Age 68" is the age the person turns on the board's date, so it reads as wrong today (07 D12) | Label it "Turns 68" |
| B | Nothing on the site answers "famous birthdays today"; the homepage has no famous people | A "Famous birthdays today" strip under "Coming up" |
| C | Date pages are 37% unique on the strict measure (07 D9) | Add a holiday/observance line per date (Christmas, July 4…) |
| D | On unclaimed dates the famous list is the third block | Show 3–5 names under the H1 |
| E | Terms and Privacy show "[Launch date]" and "[If required: … Article 27 GDPR.]" | He fills them in from the admin (`/admin/pages`) |
| F | Footer month row and month pages aren't in his mockup (07 D10, D11) | Keep both; send him the screenshots |
| G | Content-Signal line in robots.txt: may AI companies train on the site? (07 D14) | His call |

## Phase 4: after launch

- Run `/seo audit https://mybday.lol` for what can't be measured locally: HTTPS/HSTS, field Core Web Vitals, CDN
  caching, screenshots.
- Search Console: submit the sitemap, then watch "Crawled – currently not indexed" on date pages for 2–4 weeks.
- `/seo google setup` for CrUX and Search Console data in later audits.
- Re-run `audit.py` after each fix so the comparable score (97/100 today) stays current.
