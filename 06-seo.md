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
