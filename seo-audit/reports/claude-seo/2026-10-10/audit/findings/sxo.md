# Search Experience (SXO) findings: mybday.lol (http://localhost:3100)

Date: 2026-10-10. Sub-agent: seo-sxo. Read-only. This is the **SXO Gap Score**, which is separate from the SEO Health Score.

## Method and evidence base

- **Target pages** were fetched with `render_page.py --mode auto --json` and `CLAUDE_SEO_LOCAL_TARGETS=localhost:3100`. All were 200, `is_spa: false`, `mode_used: raw`. Every page is server-rendered, so the raw HTML is complete. They were parsed with `parse_html.py --json`. Pages: `/`, `/october`, `/october-7` (unclaimed, which is the state of 362 of 366 boards today) and `/october-10` (today, claimed). A curl sweep of all 366 date pages covered the label checks.
- **SERPs** came from 9 WebSearch queries: "october 7 birthday", "october birthdays", "famous birthdays today", "march 14 birthday" (to check the pattern holds on other dates), "born on october 7 famous people zodiac facts", "what is special about being born on october 7th", "how common is my birthday october 7 rank", "who shares my birthday celebrities", and "birthday facts what day was i born ...". Competitor layouts were checked with WebFetch: famousbirthdays.com/october7.html, famousbirthdays.com/oct.html, onthisday.com/birthdays/october/7, en.wikipedia.org/wiki/October_7, and the UPI "Famous birthdays for Oct. 7" article. nationaldaycalendar.com returned 403.
- **Caveat:** the WebSearch backend returns organic links plus a synthesis. It does not show Google's SERP features (PAA, AI Overview layout, ads, local pack, image packs). User stories therefore cite organic result types, titles and the query variants. See Limitations.

## SERP analysis

### "october 7 birthday" (the pattern for 366 date pages)

| # | Result | Taxonomy type | Format | Depth / media |
|---|---|---|---|---|
| 1 | imdb.com/list/ls046640381 "Celebrity Birthdays: October 7" | Blog Post (informational list) | Photo list | Dozens of people, headshots |
| 2 | imdb.com/list/ls079399201 "Birthdays: October 7" | Blog Post (list) | Photo list | Same |
| 3 | upi.com "Famous birthdays for Oct. 7: Nicole Ari Parker, Yo-Yo Ma" (2024) | Blog Post (news) | Dated article | About 27 names with birth year and age, gallery |
| 4 | ca.news.yahoo.com, UPI syndication | Blog Post (news) | Dated article | Same |
| 5 | upi.com, 2025 edition | Blog Post (news) | Byline "UPI Staff", dated Oct. 7, 2025 | 27 names, 5 photos |
| 6 | nationaldaycalendar.com "October 7 birthdays and events" | Blog Post (reference) | Days, events, birthdays | Not fetched (403) |
| 7 | zodiacsign.com "October 7th Zodiac (Libra) Horoscope" | Blog Post (astrology) | Traits article | Zodiac only |
| 8 | famousbirthdays.com/october7.html "October 7 Celebrity Birthdays" | Blog Post (directory list) | Ranked photo list | 48 people: photo, age, profession, profile link |
| 9 | stripe.jhu.edu "october 7th birthdays" | Blog Post | Article | Low quality |

Related competitors not in this top 9 but fetched for comparison: onthisday.com, with about 150 names on page 1, category filters (Actors/Athletes/Musicians) and paging, and Wikipedia "October 7", with about 225 births and the "280th day of the year (281st in leap years)" lead.

**Consensus:** 9 of 9 results are informational list or reference pages. None is a Landing or Product page. Dominant type: **Blog Post / informational list, 100% confidence.** The winning format is a long list of famous people with a photo, age and profession, often dated.

The synthesis led with Yo-Yo Ma, Toni Braxton, Thom Yorke, John Mellencamp, Lewis Capaldi, Vladimir Putin, Desmond Tutu, Niels Bohr and Simon Cowell. "march 14 birthday" showed the same pattern: nationaldaycalendar, syndicated "celebrity birthdays mar14" news, and auto-generated list and zodiac pages.

Sub-intents seen in the query variants:
- **Zodiac:** "what is special about being born on october 7th" returned 9 of 9 zodiac or astrology pages, all low-quality spam domains.
- **Rarity:** "how common is my birthday october 7 rank" returned happiestbaby, worldatlas and truthorfiction top-10 lists. The synthesis "couldn't find an exact rank for October 7". This is a content gap in the SERP that mybday.lol fills.

### "october birthdays" (12 month pages)

Results: AARP "10 Milestone Celebrity Birthdays in October" (slideshow), blackamericaweb (playlist), Fandango (photo gallery), historic-uk (history list), deanmorriscards "October Birthday Signs, Celebrities, Birthstones, Colours, Flowers" (blog), nationaldaycalendar Oct 1, potuspages (presidents), famousbirthdays.com/oct.html (31 day tiles with photos, each linking to a day page), and bornglorious (list).

**Consensus:** 10 of 10 informational lists, 100%. Two formats win: galleries of celebrities, and "signs + birthstone + flower + celebrities" explainers. The famousbirthdays.com/oct.html hub, with 31 day tiles linking to day pages, is structurally close to our `/october`.

### "famous birthdays today"

Results: Yahoo/UPI "Famous birthdays for Oct. 10: Charles Dance, Ben Vereen", hollywoodlife "Famous Birthdays Today — October 10", careerindia "Today in History, October 10", nationaldaycalendar Oct 10, editorialge "On This Day October 10", boredpanda "Mario Lopez And 9 More Celebrity Birthdays Today (Oct 10)", timegoggles, curiosaday substack, and stripe.jhu.edu.

**Consensus:** 9 of 9 are date-resolved daily lists, 100%. Each one names today's date in its title and lists today's famous people with photos. The famousbirthdays.com homepage normally holds this query on Google but did not appear in this backend (see Limitations).

## Page-type mismatch (primary finding)

| Keyword | SERP dominant type | Our page | Our type (taxonomy) | Severity |
|---|---|---|---|---|
| "famous birthdays today" | Daily famous-birthday list (Blog Post/list), 100% | `/` | **Landing Page**: CTA-led ("Claim the top spot", "Boost", "Remind me"), title "Birthday Leaderboard: Bid to Own Today's Spot", **zero famous people on the page** | **CRITICAL** |
| "october 7 birthday" (x366) | Informational famous-people list, 100% | `/october-7` | **Hybrid**: informational About section, facts and famous list, with a commercial "Own the top spot / Bid on October 7" module first | **MEDIUM**: the right content is there, but it is ordered behind the commerce module and much thinner than the SERP norm |
| "october birthdays" (x12) | Informational list / hub, 100% | `/october` | Hybrid leaning informational: day hub, two famous names per day, signs, birthstone, flower | **ALIGNED** (a minor ordering issue, see F6) |

Lead insight: the 366 date pages are the right page type for their keyword family. What they lose is depth and order: the answer to "who was born on October 7" is the third block, after a bid card and a statistics block. The only real type mismatch is "famous birthdays today". The page Google would see for that query, the homepage, is about a private person (Jess Moreno) and contains no famous birthdays at all.

## User stories (from SERP signals)

1. **Awareness: birthday-twin seeker.** As someone typing my own birthday, I want to see which celebrities share it, because it is a small fun identity moment, but I'm blocked by an **information gap**: our list is 15 names with no photos, and Famous Birthdays shows 48 with headshots.
   *Source: IMDb photo lists at positions 1-2, famousbirthdays.com at 8 (48 entries with photo, age and profession), "who shares my birthday celebrities" query.*
2. **Awareness, daily habit: today's-birthdays browser.** As a daily visitor of celebrity news, I want today's famous birthdays at a glance, because it is a quick ritual and social-post fodder, but I'm blocked by a **page-type mismatch**: the homepage shows a stranger's leaderboard spot and no celebrities.
   *Source: 9 of 9 "famous birthdays today" results are date-titled daily lists (UPI/Yahoo, HollywoodLife, Bored Panda).*
3. **Awareness: zodiac seeker.** As someone curious what my birth date "means", I want my sign and what it says about me, because I'm looking for self-recognition, but I'm blocked by the **information gap**: we show one "Zodiac sign: Libra" card and nothing to explore.
   *Source: zodiacsign.com in the "october 7 birthday" top 10, and 9 of 9 astrology results for "what is special about being born on october 7th".*
4. **Consideration: birthday-stats seeker.** As someone wondering if my birthday is rare, I want a real rank for my exact date, because I want a fun fact to share, but I'm blocked by **unanswered SERPs**: competitors give only top-10 lists.
   *Source: "how common is my birthday october 7 rank". The synthesis could not find an exact rank, and the results were happiestbaby, worldatlas and truthorfiction top-10 lists.*
5. **Consideration: month planner / gift buyer.** As someone planning for an October birthday, I want the signs, birthstone, flower and notable October birthdays in one place, because I'm picking a gift or a theme, but I'm blocked by **scan friction**: on `/october` the birthstone and flower cards sit at the very bottom.
   *Source: deanmorriscards "Signs, Celebrities, Birthstones, Colours, Flowers", AARP and Fandango galleries.*

Coverage: awareness (1, 2, 3) and consideration (4, 5). No SERP signal showed decision or commercial intent. No ads appeared in any result set, and no result offers anything to buy. The paid "claim your birthday" action therefore has to be **discovered** on pages people reach for informational reasons. That makes the informational experience the conversion funnel.

## SXO Gap Score: `/october-7` (representative date page)

| Dimension | Score | Evidence |
|---|---|---|
| Page Type | 10/15 | Hybrid in a 100% informational SERP. The right ingredients are there (About section, facts, `Famous people born on October 7`), but the first block after the H1 is "Own the top spot / Bid $5 or more / Bid on October 7". |
| Content Depth | 8/15 | 328 words (parse_html). 10 famous names plus 5 "Also born on" (15 total) vs 27 (UPI), 48 (Famous Birthdays), about 150 (On This Day) and about 225 (Wikipedia). Living people only (`MINUS { ?p wdt:P570 [] }` in `server/famous-source.ts`), so names the SERP leads with, such as Desmond Tutu and Niels Bohr, can never appear. Toni Braxton, John Mellencamp and Vladimir Putin are also missing from the top 15. Strong unique facts: rank #118 of 366, about 11,400 births a year, +2% vs an average day, half birthday, weekday next year, day of year. |
| UX Signals | 10/15 | Good: prev/next day, "Pick a date", "Back to today", "All October birthdays", breadcrumb, SSR (no SPA shell). Weak: the famous list is the third section. Names are not links (Famous Birthdays links every name to a profile). No filter by profession, unlike On This Day's Actors/Athletes/Musicians. |
| Schema | 12/15 | `WebPage` with `mainEntity` `ItemList` of `Person` (`birthDate`, `sameAs` Wikidata), plus `BreadcrumbList`. Missing `dateModified`, and no `image` on Person. |
| Media | 3/15 | **0 `<img>` tags** on `/`, `/october-7` and `/october-10`. Every photo-led competitor (IMDb, Famous Birthdays, UPI, HollywoodLife, Bored Panda) uses headshots. The only image is the per-page OG card (`/october-7/opengraph-image`, 1200x630). |
| Authority | 7/15 | Good: on-page citation "Source: FiveThirtyEight (CDC/NCHS, SSA), US births 1994–2014", and Wikidata `sameAs`. Weak: a new domain, no About or editorial page, a placeholder "b" icon (known), the age label issue (F3) and mixed "footballer"/"soccer player" labels (F5). |
| Freshness | 6/10 | Famous data was refreshed today and ages are computed per year. But nothing visible says "updated", there is no `dateModified`, and htmldate guessed `publication_date: 2026-01-01` for the date and month pages. Competing news results carry visible dates (UPI: "Oct. 7, 2025, 3:00 AM"). |
| **Total** | **56/100** | |

Other pages, briefly:
- `/october`: **64/100**. Type aligned. 674 words, the signs/birthstone/flower trio, 31 linked days with two famous names each, `CollectionPage` + `ItemList`. Loses points on media (0 images) and the order of the top-bid grid (F6).
- `/` for "famous birthdays today": **22/100**. CRITICAL type mismatch: 215 words, no famous people, no date-list content.

## Persona scores

Weighting: the SERPs are 100% informational, so personas 1, 2 and 4 carry the most weight. P6 is the site's own conversion persona. **No SERP signal supports it**, so it is scored separately and kept out of the weighted average.

| Persona (page scored) | Relevance | Clarity | Trust | Action | Total | Rating |
|---|---|---|---|---|---|---|
| P2 Today's-birthdays browser (`/`) | 4 | 5 | 12 | 10 | **31** | Critical mismatch |
| P3 Zodiac seeker (`/october-7`) | 9 | 18 | 14 | 6 | **47** | Needs work |
| P1 Birthday-twin seeker (`/october-7`) | 18 | 13 | 15 | 13 | **59** | Needs work |
| P5 Month planner (`/october`) | 19 | 15 | 16 | 17 | **67** | Good |
| P4 Birthday-stats seeker (`/october-7`) | 23 | 20 | 21 | 12 | **76** | Good |
| P6 Birthday person who wants a spot (`/october-7`), site-defined, not SERP-derived | 20 | 21 | 13 | 22 | **76** | Good |

Evidence per persona:
- **P2:** the homepage H1 is "October 10", followed by a "Jess Moreno" card, gifts, share and "Coming up". "See everyone" links to `/october-10`, which does have the list (Charles Dance, Dan Stevens, David Lee Roth...), but the link copy is "33 other people are celebrating October 10" and does not mention famous people.
- **P3:** one card, "Zodiac sign / Libra / Star sign for October 7". No traits, no date range, no link. This is a dead end.
- **P1:** the list sits after the bid card and the About block, with 15 names, no photos and no links. "Age 68" for Simon Cowell, who is 67 today (F3).
- **P5:** the month intro paragraph is strong. "Top bid on every October date" shows 31 tiles reading "1 open", "2 open"..., which is noise to an informational visitor and sits above "Every October birthday". The birthstone and flower cards come last.
- **P4:** the best-served persona, and a real differentiator: an exact rank (#118 of 366) with a cited source, which the SERP lacks. Action is weak because there is no full ranking or comparison page to explore.
- **P6:** "Bid $5 or more" and the "Bid on October 7" CTA come first. Trust is thin on an empty board: no social proof, and "Nobody has claimed October 7 yet". The "mybday.lol never touches the money" reassurance appears on the homepage only.

**Weakest persona: P2 (31).** Top issue: no page serves "today's famous birthdays". Fix: see F1.
**Systemic issues:** Action is low for every informational persona (6-13): famous names, the zodiac sign and the rank are all dead ends. Media is zero across all pages.

## Findings

### F1. High (SERP mismatch): "famous birthdays today" has no matching page; the homepage shows no famous people
- **Evidence:** 9 of 9 SERP results are date-titled daily lists. `grep -i famous` on the homepage HTML returns nothing. The homepage title is "Birthday Leaderboard: Bid to Own Today's Spot" and the H1 is "October 10". The famous list for today exists only on `/october-10`, reached through "See everyone" ("33 other people are celebrating October 10").
- **Fix (suggestion for the client, since the homepage is the pixel-locked mockup):** add a compact "Famous birthdays today" strip under "Coming up", e.g. "Also born Oct 10: Charles Dance (80), Dan Stevens (44), David Lee Roth (72) → See all October 10 birthdays", linking to `/october-10`. If the mockup must stay untouched, accept that today's date page is the ranking target for "famous birthdays october 10"-style queries. Its title already matches ("October 10 Birthday: Famous People, Facts & Who's #1"). Do not chase the bare "famous birthdays today" query with the homepage.

### F2. Medium (page type and order): on date pages the answer comes third, after the bid card
- **Evidence:** the source order on `/october-7` is H1 "Everyone celebrating October 7" → "Own the top spot / Bid $5 or more / Bid on October 7" → "Nobody has claimed October 7 yet" → `About October 7 birthdays` (paragraph plus 6 fact cards) → `Famous people born on October 7`. On 362 of 366 boards (unclaimed), the "everyone celebrating" heading is followed by nobody until the famous list.
- **Fix (client suggestion):** on **unclaimed** boards only, move the famous list (or its first 3-5 names) directly under the bid card, or add a one-line teaser under the H1 ("Born today: Simon Cowell, Lewis Capaldi, Yo-Yo Ma ↓"). Claimed boards keep the mockup order. The visual audit F-item already suggests a different unclaimed-state heading.

### F3. Medium (trust): "Age N" shows the age at the *next* birthday, which reads as wrong today
- **Evidence:** `server/famous.ts:17` says "The age they turn on this date in the board's year". On `/october-7` (viewed Oct 10, 2026, next occurrence 2027): "Simon Cowell ... Age 68" (born 1959-10-07, so 67 today), "Shawn Ashmore ... Age 48" (born 1979, so 47), "Lewis Capaldi ... Age 31" (born 1996, so 30). On `/october-12`: "Josh Hutcherson ... Age 34" (33 until Oct 12). Competitors (Famous Birthdays, UPI) show current age, and searchers cross-check famous ages.
- **Fix:** change the label, not the math: "Turns 68" when the board's date is in the future, "68 today" on the day itself, and keep "Age N" only for past dates. This is a change to `About.tsx:89` copy only.

### F4. Medium (content depth / media): famous list is 15 names, living only, no photos, no links
- **Evidence:** 10 names plus 5 "Also born on" vs 27 to 225 on ranking pages. 0 `<img>` tags. `wdt:P570` exclusion means no deceased people. Names are plain text. The SERP synthesis for "october 7 birthday" leads with names we do not show (Toni Braxton, John Mellencamp, Vladimir Putin, Desmond Tutu, Niels Bohr).
- **Fix:** (a) raise the visible list to 20-30 (the "Also born on" line can hold more names cheaply). (b) Consider a "Born on October 7 in history" line for deceased icons. This is a product call, since the board concept is about living birthday twins. (c) Small Wikimedia Commons thumbnails (Wikidata P18) with attribution, or at least link each name to its Wikipedia article. Photos are a layout change, so check them against the mockup first.

### F5. Low (clarity / consistency): "footballer" still appears on 221 of 366 date pages, next to "soccer player"
- **Evidence:** a sweep of visible HTML (scripts excluded) found 353 "footballer" mentions on 221 pages, against 703 "soccer player". On `/october-12` the two sit side by side: "Carlton Cole, English footballer" and "Ledley King, English soccer player". On `/october-10`: "James Trafford, English footballer" and "Felix Nmecha (German soccer player)". Commit 9b11bd8 ("say 'soccer' for every association football label") apparently maps "association football player" but not Wikidata's "footballer" descriptions. The same strings are in the JSON-LD `Person.description`.
- **Fix:** extend the label mapping to `/\bfootballer\b/ → "soccer player"` (and "footballer and manager" → "soccer player and manager"), add a Vitest case, and re-run the refresh.

### F6. Low (month page order): the "Top bid on every October date" grid is mostly "open" noise above the useful list
- **Evidence:** on `/october`, H2 "Top bid on every October date" shows 31 tiles, 27 of them reading "open", before H2 "Every October birthday" (famous names, sign, rank). Birthstone, flower and star-sign cards come last. The SERP rewards the signs/birthstone/flower trio (deanmorriscards) and day hubs (famousbirthdays.com/oct.html).
- **Fix (client suggestion):** put "Every October birthday" first, or move the Birthstone/Birth flower/Star signs cards up next to the intro paragraph.

### F7. Low (dead ends): zodiac card and rank have nowhere to go
- **Evidence:** "Zodiac sign / Libra" and "#118 ... out of 366" are plain text. The P3 Action score is 6/25 and P4 is 12/25. "what is special about being born on october 7th" is 9 of 9 low-quality astrology pages, an easy SERP to beat.
- **Fix:** later content candidates (not now): a "Most common birthdays: all 366 ranked" page linked from the rank card, and a short Libra/Scorpio date-range explainer linked from the zodiac card. Both use data the site already holds.

### F8. Low (freshness signals)
- **Evidence:** no `dateModified` in the `WebPage` JSON-LD and no visible "updated" line. htmldate inferred `2026-01-01` for `/october-7` and `/october`. The famous data was refreshed today.
- **Fix:** add `dateModified` (the famous-data refresh time) to the date and month `WebPage`/`CollectionPage` nodes, and optionally a small "Famous birthdays updated Oct 10, 2026" under the list.

### F9. Info: H1 lacks the keyword (known mockup copy)
- The `/october-7` H1 "Everyone celebrating October 7" has no "birthday". The title and H2 ("About October 7 birthdays") carry it. This is acceptable and is mockup copy. Noted for context only.

## What works

- **The page type is right for 378 of the pages** (366 dates and 12 months): server-rendered informational pages whose titles match the SERP vocabulary ("October 7 Birthday: Famous People, Facts & Who's #1", "October Birthdays: Famous People, Facts & Top Bids").
- **A unique, cited birthday-rarity fact on every date** ("#118 ... out of 366, about 11,400 babies", source FiveThirtyEight CDC/NCHS SSA). The SERP for "how common is my birthday [date]" has no exact answer, which makes this the site's strongest SXO differentiator.
- **Rich structured data:** `ItemList` of `Person` with `birthDate` and Wikidata `sameAs`, `BreadcrumbList`, and `CollectionPage` on months.
- **Strong date-to-date navigation** (prev/next, month, picker, back to today) and a month hub that mirrors famousbirthdays.com/oct.html.
- **A clear commercial path for the site's own persona:** "Bid $5 or more" comes right after the H1, with no login wall to browse.
- A per-page OG card (1200x630) for social sharing.

## Category score: Search Experience 58/100

This blends the date pages (56, 366 pages, weighted most), the month pages (64) and the homepage's "famous birthdays today" mismatch (22, low weight because the homepage is deliberately a product page). Content is right and ordered for the business. Depth, photos and onward links still trail the informational SERP.

## Cross-skill pointers
- Famous-list depth, freshness and E-E-A-T signals: `/seo content`.
- `dateModified` and Person `image`: `/seo schema`.
- No local intent in any SERP, so `/seo local` is not needed.

## Limitations
- WebSearch is not a live Google SERP. PAA, AI Overview citations, image packs, ads and the exact rank order on Google were not observable. famousbirthdays.com's homepage (usually #1 for "famous birthdays today") did not appear in this backend. No search volumes are available, so persona weights are qualitative.
- No rendered DOM: the plugin's headless browser can't load localhost. The above-the-fold order is inferred from source order, consistent with the visual agent's notes.
- One date (Oct 7) was examined in depth, with Oct 10, Oct 12, Jan 1, Jul 4, Feb 29 and Dec 25 spot-checked and a 366-page label sweep. The data is seed/demo, so claimed-board states will differ at launch.
- nationaldaycalendar.com returned 403 to WebFetch, so its layout was not compared.

## Structured findings (for audit-data.json, category "Search Experience")

```json
{
  "category": "Search Experience",
  "score": 58,
  "sxo_gap_scores": {"/october-7": 56, "/october": 64, "/ (famous birthdays today)": 22},
  "findings": [
    {"id": "SXO-1", "severity": "High", "title": "No page matches 'famous birthdays today'; homepage has zero famous people", "url": "/", "fix": "Client suggestion: 'Famous birthdays today' strip linking to today's date page; else target date pages only"},
    {"id": "SXO-2", "severity": "Medium", "title": "Date page answer (famous list) is the third block, after the bid card", "url": "/october-7", "fix": "Client suggestion: on unclaimed boards, surface 3-5 famous names under the H1 or bid card"},
    {"id": "SXO-3", "severity": "Medium", "title": "'Age N' is age at next birthday (Simon Cowell 'Age 68', is 67)", "url": "/october-7", "fix": "Label 'Turns N' for future dates, 'N today' on the day"},
    {"id": "SXO-4", "severity": "Medium", "title": "Famous list 15 names, living only, no photos, no links vs 27-225 on competitors", "url": "/october-7", "fix": "Raise to 20-30, link names, consider Commons thumbnails"},
    {"id": "SXO-5", "severity": "Low", "title": "'footballer' on 221/366 date pages beside 'soccer player'", "url": "/october-12", "fix": "Map 'footballer' to 'soccer player' and re-run refresh"},
    {"id": "SXO-6", "severity": "Low", "title": "Month page 'Top bid' grid (27/31 'open') above useful list", "url": "/october", "fix": "Client suggestion: list or birthstone/flower cards first"},
    {"id": "SXO-7", "severity": "Low", "title": "Zodiac card and rank are dead ends", "url": "/october-7", "fix": "Later: all-366 ranking page and sign explainer"},
    {"id": "SXO-8", "severity": "Low", "title": "No dateModified / visible updated date", "url": "/october-7", "fix": "Add dateModified from famous refresh time"},
    {"id": "SXO-9", "severity": "Info", "title": "H1 lacks 'birthday' (mockup copy)", "url": "/october-7", "fix": "None required"}
  ]
}
```
