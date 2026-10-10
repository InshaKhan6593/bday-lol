# 06: SEO package (included in the agreed scope)

## URLs
- **366 date pages**: `bday.lol/october-7` (full lowercase month name + day, no leading zero). `february-29` included.
- **12 month pages**: `bday.lol/october`.
- Everything is linked together: each date page has **previous / next day** links ("← October 6", "October 8 →", wrapping Dec 31 ↔ Jan 1) and an **"All October birthdays"** link to the month page. Month pages link to all their dates (and probably to the previous and next months).
- The date page **is** the "Find your birthday" page for that date. The calendar navigates between these URLs. The nav "Find your birthday" link goes to today's date page.
- ⚠ The mockup's share URL uses `bday.lol/oct-7`. The SEO spec says `/october-7`. Use `/october-7` as canonical, and consider 301 redirects from `/oct-7` (see open questions).

## Rendering
- Page text must **load with the page (server-rendered)**: Next.js SSR or ISR.
- The leaderboard **refreshes every few minutes** (ISR revalidate of a few minutes, plus on-demand revalidation after payments is a good fit).
- Month pages are not designed in the mockup. Build them in the same visual style (see open questions).

## Metadata (per date page)
- Unique `<title>`, e.g. **"October 7 Birthday: How Common It Is, Famous Birthdays & Who's #1 Today | bday.lol"**
- A unique meta description.
- A unique **OG / share image** per date (1.91:1 card, the style shown on the Success page: theme ground, avatar, "TODAY'S BIRTHDAY", date, name). Generate it with `next/og` (`ImageResponse`).
- Canonical URLs.

## Indexing
- **sitemap.xml** with the home page, 366 date pages, 12 month pages and How it works.
- **Google Search Console** setup and sitemap submission. The client's Google account is needed for verification.
- **noindex** on the Claim page, checkout/success pages and search result states. Also noindex the admin pages and block them in robots.txt.

## "About [date] birthdays" section (bottom of each date page, below the leaderboard)
The visual design is in `Day.dc.html` (see 03-pages-and-ui.md §2.8).

### 1. Commonness rank (FiveThirtyEight US births data)
- Source: FiveThirtyEight `births` dataset (GitHub `fivethirtyeight/data/births`: `US_births_1994-2003_CDC_NCHS.csv` and `US_births_2000-2014_SSA.csv`). Compute the average births per month-day, rank them 1–366, and store the result as a static table (compute once at build time).
- Copy:
  - Normal: **"#X"** + "The **X-th** most common birthday in the US, out of 366" + "About **N** US babies are born on [date] each year." (N rounded, the mockup rounds to the nearest 100.)
  - Rank > 300: "One of the least common birthdays in the US, out of 366".
  - **Feb 29**: "#366" + "The rarest birthday of the year" + "It only comes once every four years."
- Note: the client's chat says "commonness rank", and the doc adds the "About N US babies…" line. Decide how to compute N (the average daily births across the dataset years) and how to handle Feb 29's adjusted rate.

### 2. Famous people (Wikidata + Wikipedia pageviews)
- The **top 10 living people** born on that month-day (fewer if not available).
- Filter to **entertainment fields**: actors, musicians, athletes, creators, TV personalities (map these to Wikidata occupations / P106 classes).
- Rank by **Wikipedia page views** (Wikimedia Pageviews API, e.g. the last 30 or 60 days).
- Show **name, what they're known for** (short occupation label, e.g. ", TV judge"), and **age** = the age they turn on this date this year ("Age 67").
- **Text only, no photos.**
- **Refresh monthly** (cron). Store the results in the DB.
- The admin can **"Hide this person"** so the next name moves up. Hidden people stay hidden across refreshes.
- **Swappable source**: put it behind a provider interface (e.g. `FamousBirthdaysProvider`) so licensed Famous Birthdays data can replace Wikidata later.
- ⚠ The mockup's sample Oct 7 list includes a politician (Vladimir Putin). That's demo data, and the **entertainment-only filter wins**.

### 3. Facts
Zodiac sign, birthstone and birth flower. The tables are in 05-business-logic.md. Card subtitles: "Star sign for October 7", "October birthstone", "October birth flower".

---

## Built (step 9, 2026-10-10)

Checked with [claude-seo](https://github.com/AgriciDaniel/claude-seo)'s rules before and after: see
[seo-audit/](seo-audit/) (the audit script and both reports).

| Piece | How it's built | Where |
|---|---|---|
| Date pages | Title `October 7 Birthday: Famous People, Facts & Who's #1` (≤ 60 characters for every date, no brand suffix). Description from the day's real data (who was born that day, how common it is, who leads or "Bids start at $5"), always 120–160 characters | `web/src/lib/seo.ts`, `web/src/app/[slug]/page.tsx` |
| Month pages | `/october`: H1, an intro unique to the month, a calendar with every date's top bid (plain links, so crawlers follow them), every date with its #1, commonness rank, sign and two famous names, stone/flower/signs cards, previous/next month | `web/src/components/month/`, `web/src/server/month-page.ts` |
| About section | A paragraph of facts that differ for every date (day of the year, weekday, commonness vs an average day, sign/stone/flower, three famous names, who leads), the rank card, then the mockup's 3 fact cards plus Half birthday / Next one / Day of the year | `web/src/components/date/About.tsx`, `web/src/lib/about.ts` |
| Commonness | FiveThirtyEight births 1994–2014 (CDC/NCHS for 1994–1999, SSA for 2000–2014), average births per date, ranked 1–365, Feb 29 always #366. Rounded to the nearest 100 on the page. Regenerate with `pnpm data:commonness` | `web/src/lib/commonness*.ts`, `web/scripts/build-commonness.ts` |
| Famous people | Wikidata: living humans with a day-precise, best-ranked birth date, 15+ Wikipedia language editions, an English article and an entertainment occupation (actors, musicians, athletes, presenters, YouTubers, streamers, comedians, models, dancers, directors, rappers, DJs, including every subclass). Anyone who is also a politician is left out (07 A4), as are under-10s. The 30 most-linked per date are ranked by English Wikipedia pageviews over the last two full months; 15 are stored and 10 shown, so a hidden person is replaced. "Known for" is the Wikidata description, shortened ("English musician"), "soccer" for association football | `web/src/server/famous-source.ts`, `web/src/lib/famous.ts` |
| Monthly refresh | Vercel Cron calls `/api/cron/famous` at 06:17 UTC on days 1–12; day N refreshes month N (about 2–5 minutes each). One query per date because a month-wide query times out on Wikidata. A date that fails keeps last month's list. Locally: `pnpm famous:refresh` (all) or `pnpm famous:refresh 10` | `web/src/app/api/cron/famous/route.ts`, `web/vercel.json` |
| Structured data | Home: Organization + WebSite. Date: BreadcrumbList (Home › October › October 7) + WebPage whose main entity is the famous list, each Person linked to Wikidata (`sameAs`). Month: BreadcrumbList + CollectionPage listing its dates. How it works keeps FAQPage (no rich result since May 2026, harmless) | `web/src/lib/seo.ts` |
| Share images | 1200×630, drawn like the Success page's link card: the #1's colors, photo or initials, "TODAY'S BIRTHDAY", the date and name. Empty dates: "UP FOR GRABS · Claim it from $5". Months, personal links (their own card) and How it works have their own | `web/src/server/og-card.tsx`, `opengraph-image.tsx` files |
| Indexing | `sitemap.xml`: home, How it works, Terms, Privacy, 12 months, 366 dates; `lastmod` = last claim/boost on the board, last famous refresh, or the date the page text changed (`CONTENT_UPDATED`). `robots.txt` allows everything public (AI search crawlers too), blocks `/api/`, `/admin`, `/dev/`, `/styleguide`, and points to the sitemap. Claim, Success and Unsubscribe are noindex but crawlable (so the noindex is seen). Personal links canonicalize to their date page | `web/src/app/sitemap.ts`, `web/src/app/robots.ts` |
| Crawl depth | The footer links all 12 months on every page; each month links all its dates, so every date page is 3 clicks from anywhere (it was up to 180) | `web/src/components/site/SiteFooter.tsx` |
| Other | Site icon (placeholder "b" until there's a logo), security headers, `GOOGLE_SITE_VERIFICATION` env for Search Console's HTML-tag method | `web/src/app/icon.tsx`, `web/next.config.ts`, `web/src/app/layout.tsx` |
