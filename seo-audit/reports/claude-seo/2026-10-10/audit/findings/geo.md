# GEO / AI Search Readiness

Target: http://localhost:3100 (production build of mybday.lol, not launched yet). Audited 2026-10-10 from raw HTML (curl) and the plugin's `render_page.py --mode never --json` (trafilatura `extracted_text`). Pages checked: `/`, `/october-7`, `/february-29`, `/october`, `/how-it-works`, plus the About paragraphs on `/january-1`, `/december-25`, `/october-10`, `/october-12`.

## GEO Readiness Score: 62 / 100

| Dimension | Weight | Score | Weighted |
|---|---|---|---|
| Citability | 25% | 68 | 17.0 |
| Structural readability | 20% | 70 | 14.0 |
| Multi-modal content | 15% | 35 | 5.3 |
| Authority and brand signals | 20% | 45 | 9.0 |
| Technical accessibility | 20% | 85 | 17.0 |
| **Total** | | | **62** |

Authority is held back mostly by things that can't exist before launch (brand mentions, backlinks, social profiles). The rest is fixable now: on-page facts and labels.

## AI crawler access (robots.txt)

robots.txt has one group: `User-Agent: *`, `Allow: /`, `Disallow: /api/`, `/admin`, `/dev/`, `/styleguide`, plus `Sitemap:`. No bot gets its own group, so every crawler is allowed. Decision D14 (client's call), reported as context. I sent each user agent to `/october-7` and every one got HTTP 200 and the same SSR HTML (48,147 bytes; bingbot/Applebot 48,075, which is Next.js's blocking-metadata variant, same content).

| Crawler | What it controls | Status |
|---|---|---|
| OAI-SearchBot | ChatGPT Search citations | Allowed |
| Claude-SearchBot | Claude search citations | Allowed |
| PerplexityBot | Perplexity index/citations | Allowed |
| Googlebot | Google Search and AI Overviews/AI Mode | Allowed |
| bingbot | Bing and Copilot grounding (and ChatGPT Search partly via Bing) | Allowed |
| Applebot | Siri/Spotlight/Safari | Allowed |
| GPTBot | OpenAI training only | Allowed (optional to block) |
| ClaudeBot | Anthropic training only | Allowed (optional to block) |
| Google-Extended | Gemini/Vertex training and grounding, not Search/AIO | Allowed (optional to block) |
| Applebot-Extended | Apple Intelligence training only | Allowed (optional to block) |
| CCBot, cohere-ai | Training corpora | Allowed (optional to block) |

## llms.txt and licensing

- `/llms.txt`: **missing** (404). `/llms-full.txt`: 404.
- RSL 1.0: none (`/license.xml`, `/rsl.xml` 404; no RSL reference in robots.txt).
- The 404 page itself is correct: `noindex`, generic title.

## Technical accessibility for AI crawlers

- Every page is server-rendered: `render_page.py` reports `is_spa: false`, `mode_used: raw`. All facts, famous people and FAQ text are in the initial HTML, so crawlers that don't run JavaScript (OAI-SearchBot, PerplexityBot, ClaudeBot) see everything.
- Sitemap at `/sitemap.xml` (200, application/xml) with per-URL `<lastmod>` (month lastmods track the famous-people refresh).
- Date pages send `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` (dynamic render on every request). That's fine for correctness, but every AI crawler hit costs a server render. Already covered by the performance/technical findings.

## Passage-level citability

### Date pages (`/october-7`, `/february-29`)

**Works well.** The "About October 7 birthdays" paragraph (about 75 words of prose) reads as a self-contained answer with concrete numbers and a source line right under it:

> "October 7 is the 280th day of the year (281st in leap years). In 2027 it falls on a Thursday. It's the 118th most common birthday in the US, with about 11,400 babies born on it each year, 2% more than on an average day. Famous October 7 birthdays include Shawn Ashmore, Simon Cowell and Lewis Capaldi." ... "Source: FiveThirtyEight (CDC/NCHS, SSA), US births 1994–2014."

`/february-29` is even more quotable: "February 29 is leap day, the 60th day of a leap year. It only comes once every four years: the next one is Tuesday, February 29, 2028. About 10,500 US babies are born on it each time, but spread over four years that makes it the rarest birthday of all." The paragraph opens with the answer, names the date in every sentence (no "it" without a referent across blocks), dates the weekday claim with its year, and keeps the numbers specific. Other dates follow the same template with real variation (Jan 1 "30% fewer than on an average day", Dec 25 "365th ... 41% fewer").

**Gaps.**
1. **Sign, birthstone and flower are not in any sentence on date pages.** They exist only as key/value fact cards (`<span>Zodiac sign</span><span>Libra</span><span>Star sign for October 7</span>`, same for Birthstone Opal and Birth flower Marigold). trafilatura's `extracted_text` for `/october-7` and `/february-29` **drops all the fact cards**: the extracted output goes straight from the source line to "Famous people born on October 7". So for the highest-volume follow-up questions ("what zodiac sign is October 7", "October 7 birthstone") the page has no extractable sentence. The month page does it right: "October birthdays are Libra from October 1 to 22 and Scorpio from October 23 to 31, with opal as the birthstone and the marigold as the birth flower." (this sentence survives extraction).
2. **"Age N" is the age at the next birthday, but it's labelled plain "Age".** `src/server/famous.ts`: `age: year - birthYear`, where `year` is the board's year ("The age they turn on this date in the board's year"). On `/october-7` (board year 2027): "Shawn Ashmore, Canadian actor Age 48", but his JSON-LD says `"birthDate":"1979-10-07"`, so he is 47 today. On `/february-29` (board 2028) "Ferran Torres ... Age 28" when he is 26 today. Quoted out of context, an AI answer would state a wrong age, and the visible text contradicts the page's own structured data. trafilatura also joins the two spans with no space: "Canadian actorAge 48".
3. **Famous-people source is not credited in visible text.** The Wikidata `sameAs` links exist only in the JSON-LD; visible text has no "Wikidata"/"Wikipedia" mention, and the names aren't links. The commonness data does have a source line, which is the pattern to copy.
4. Wording is inconsistent after today's refresh: `/february-29` shows "Ferran Torres, Spanish footballer" and "Jesper Lindstrøm (Danish footballer)" next to "Uzbek soccer player". The normaliser (`src/lib/famous.ts:99-100`) only rewrites "association football(er| player)", not a bare "footballer".

### Month page (`/october`)

Strong. The intro paragraph (about 85 words) is the best passage on the site: most/least common date with rank and count, sign ranges, birthstone, flower, and the number of claimed dates, all in one sentence block that survives extraction. Weak spot: the "Every October birthday" list shows weekdays from two different years without saying which: "1 Fri October 1" (2027) ... "9 Sat October 9" (2027), "10 Sat October 10 Today" (2026), "11 Sun October 11" (2026). A crawler that pulls one row gets an unlabelled weekday. trafilatura also keeps only the intro and fact cards; the per-date rows are treated as boilerplate (so it's fine that the intro carries the summary).

### How it works (`/how-it-works`)

Good for "how does mybday.lol work" questions. The opening defines the product in two sentences ("Every day, mybday.lol shows one person on its homepage. Whoever bids the most on that date gets the spot, until someone outbids them."). The 11 FAQ answers are short, direct and self-contained, each starting with the answer ("No.", "Yes.", "$5 for an open date.", "Midnight to midnight, Eastern Time."). Prices and rules are specific ($5 minimum, +$1 to pass, boosts from $2, non-refundable, gifts go direct via Venmo/Cash App/Amazon/Throne). Question-form headings exist here as FAQ items; FAQPage schema kept on purpose (Google retired FAQ rich results, May 2026; context only).

### Homepage

204-236 words of mockup copy (known, decided). Not a citation target; its job is entity definition, which the WebSite/Organization schema covers.

## Structural readability

- Clean outline everywhere: one H1, H2 "About October 7 birthdays", H3 "Famous people born on October 7"; month page H1 + two H2s; How it works H1 + step H2s + "Questions".
- Headings are statements, not questions. On the date page, a question form isn't required; the bigger win is getting the facts into prose (gap 1).
- Fact cards are `<div>/<span>` triples. A `<dl>` (`<dt>Zodiac sign</dt><dd>Libra</dd>`) gives parsers explicit key/value pairs and can be styled to look the same, so the mockup is untouched.
- Famous people are a real `<ul>` with Person ItemList schema (rank, `birthDate`, Wikidata `sameAs`). Good.

## Multi-modal content

- No `<img>`, video or `<table>` on any audited page; visuals are inline SVG icons. People photos are user content on claimed boards only.
- Every page has its own generated OG image (`/october-7/opengraph-image`, 200 image/png, 1200x630). That helps link previews and multimodal answers that show a thumbnail.
- The month "Every October birthday" grid is tabular data (date, weekday, top names, sign, rank, status) shown as list markup; a `<table>` (or the existing ItemList, enriched) would be easier to extract. The design is fixed by the mockup, so this is a low-priority semantic tweak only.

## Authority and brand signals

**Present:** source attribution for commonness (FiveThirtyEight / CDC-NCHS / SSA, 1994–2014); every famous person linked to Wikidata via `sameAs` with `birthDate`; Organization + WebSite schema with `@id`s that WebPage/CollectionPage pages reference through `isPartOf`; consistent brand name "mybday.lol" in passages ("Nobody has claimed October 7, 2027 on mybday.lol yet"), which helps AI answers attribute the quote.

**Missing:**
- No visible "updated" date and no `dateModified` on WebPage/CollectionPage, though the famous data was refreshed today and the sitemap has lastmod. render_page.py's `publication_date` falls back to `2026-01-01` (from the "© 2026" footer), which is what an extractor will guess.
- Organization has no `sameAs` (no social profiles yet), the logo is the placeholder "b" icon (known), the contact is a gmail address, and there's no About page (`/about` 404). These are normal before launch.

**Brand mentions (Wikipedia, Reddit, YouTube, LinkedIn): can't be measured.** The site isn't launched and the domain has no public footprint yet, so there's nothing to look up. YouTube mentions correlate most strongly with AI citations (~0.737), with Reddit and Wikipedia also high and backlinks weak (~0.266). The launch plan should create those mentions on purpose (see below). No DataForSEO tools were available in this run, so there's no live ChatGPT/LLM mention check.

## Platform notes and readiness scores (on-page readiness, before launch)

| Platform | Score | Notes |
|---|---|---|
| Google AI Overviews / AI Mode | 66 | Follows Googlebot (allowed). SSR, clean schema, the commonness passage fits "how common is my birthday" queries well. Inclusion depends on ranking first, which depends on authority and the known ~37% uniqueness of date pages. Google-Extended has no effect on AIO. |
| ChatGPT Search | 56 | OAI-SearchBot allowed (GPTBot status is irrelevant here). Leans on Bing's index plus brand/forum mentions, which are zero before launch. The FAQ answers and the Feb 29 passage are the most quotable. |
| Perplexity | 62 | PerplexityBot allowed. Favours specific stats with a named source, which the date and month passages have. The bare "Age N" will get quoted wrong here first. |
| Bing Copilot | 58 | bingbot allowed. Needs the site in Bing Webmaster Tools + sitemap after launch. No IndexNow (`grep indexnow` finds nothing); with 366 boards whose #1 changes daily, IndexNow pings for changed boards are cheap and help Bing/Copilot freshness. |

## Findings

### Medium: "Age N" shows next-birthday age, contradicting the page's own birthDate
- Evidence: `/october-7` "Shawn Ashmore, Canadian actor Age 48" vs JSON-LD `"birthDate":"1979-10-07"` (47 on 2026-10-10); `/february-29` "Ferran Torres, Spanish footballer Age 28" (26 today). Code: `src/server/famous.ts:45` `age: year - Number(row.birthDate.slice(0, 4))`, with `year` = board year. trafilatura output: "Canadian actorAge 48".
- Fix: label it what it is, e.g. "Turns 48 on Oct 7, 2027" (or show the current age on boards whose date has passed), and keep the label and number in one text node with a separator so extraction reads "Canadian actor, turns 48". Small change in `About.tsx` line 89.

### Medium: Sign, birthstone and flower are missing from the date-page prose
- Evidence: trafilatura `extracted_text` for `/october-7` and `/february-29` contains no "Libra", "Opal", "Marigold" or "Pisces". They appear only in fact-card spans. The month page prose has them and they survive extraction.
- Fix: add one sentence to the generated About paragraph (`src/lib/about.ts`), e.g. "People born on October 7 are Libras; October's birthstone is the opal and its birth flower is the marigold." It's per-date (the sign changes at cusps), it answers the top follow-up questions, and it adds a little unique text. The cards stay as designed.

### Medium: No llms.txt
- Evidence: `GET /llms.txt` 404, `/llms-full.txt` 404.
- Fix: add a static `app/llms.txt/route.ts` (or `public/llms.txt`): one paragraph defining mybday.lol, links to How it works, the 12 month pages, Terms/Privacy, and a note that each `/month-day` page lists commonness (FiveThirtyEight/CDC), sign, birthstone, flower and famous people (Wikidata). Effort: about 30 minutes. It's a low-cost signal; no major engine has said it uses llms.txt for ranking, so don't expect much from it.

### Low: No freshness signal on date and month pages
- Evidence: no `dateModified` in WebPage/CollectionPage JSON-LD, no visible "Updated" text; render_page.py `publication_date` = `2026-01-01` (footer year guess). Sitemap lastmod exists.
- Fix: add `dateModified` (famous-data refresh time or last bid change, the same value the sitemap uses) to the WebPage/CollectionPage nodes in `src/lib/seo.ts`. Optionally put a small "Updated Oct 10, 2026" next to the source line, if the mockup allows it.

### Low: Famous-people data source not credited visibly
- Evidence: visible text of `/october-7` has 0 matches for "Wikidata|Wikipedia"; names aren't linked; the only source line is the FiveThirtyEight one.
- Fix: extend the source line: "Sources: FiveThirtyEight (CDC/NCHS, SSA), US births 1994–2014; famous people from Wikidata." Optionally link names to their Wikipedia pages.

### Low: "footballer" slips past the soccer normaliser
- Evidence: `/february-29` "Spanish footballer", "Danish footballer" vs "Uzbek soccer player". `src/lib/famous.ts:99` matches only `association football(er| player)`.
- Fix: also map `\bfootballer\b` to "soccer player" (watch for American/Australian/Gaelic football; Wikidata descriptions usually say "American football player"), add a Vitest case, re-run `pnpm famous:refresh`.

### Low: Month list weekdays mix two years without a label
- Evidence: `/october`: "9 Sat October 9" (2027) next to "10 Sat October 10 Today" (2026).
- Fix: show the year when a row is for next year, or put an aria/visually-hidden year in the row ("Sat, Oct 9, 2027").

### Low: Fact cards and month grid aren't semantic key/value or table markup
- Evidence: fact cards are `<span class=factKey>/<span class=factValue>/<span class=factSub>` inside a div; the month grid is list markup.
- Fix: render the cards as `<dl>`/`<dt>`/`<dd>` with the same classes (no visual change). Optional.

### Info: All AI crawlers allowed (D14)
- Context only. If the client wants to opt out of training, add groups for GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot and cohere-ai. That leaves OAI-SearchBot, Claude-SearchBot, PerplexityBot, Googlebot, bingbot and Applebot open, so search visibility doesn't change.

### Info: Brand mentions are zero by definition (unlaunched)
- Launch plan for citation signals: a short YouTube/TikTok explainer ("I bid $X to own my birthday on the internet"), a Reddit launch post in relevant subs (r/InternetIsBeautiful, r/SideProject), Product Hunt, and LinkedIn/X profiles added to Organization `sameAs`. Don't create a Wikipedia entity until there's independent press coverage.

### Info: Stray local file served at /_icon-options.html
- Evidence: `GET /_icon-options.html` 200, 324 KB, title "Icon options", no noindex. It's in `public/` but excluded via `.git/info/exclude`, so git-based deploys won't ship it. A CLI deploy from the working folder might.
- Fix: delete it or move it out of `public/` before any deploy from the local folder.

## What works
- Every page is server-rendered with the full text in raw HTML; every AI search and training crawler is allowed and gets HTTP 200.
- Date-page About paragraph: answer-first, specific statistics (rank out of 366, babies per year, % vs average) with a named source line right below. Strong citation material, especially `/february-29`.
- The month-page intro is a self-contained summary (most/least common, sign ranges, birthstone, flower) that survives boilerplate extraction.
- How it works: product defined in two sentences, plus 11 answer-first FAQ entries with exact prices and rules.
- Person ItemList schema with `birthDate` and Wikidata `sameAs` for 15 people per date gives strong entity grounding. Breadcrumbs, and WebPage/CollectionPage tied to WebSite/Organization `@id`s.
- Brand name inside the quotable passages, so a lifted quote carries the attribution with it.
- Per-page OG images and a sitemap with real lastmod values.

## Top 5 highest-impact changes

| # | Change | Impact | Effort |
|---|---|---|---|
| 1 | Relabel "Age N" as "Turns N on <date>" and fix the span spacing | Stops wrong ages from being quoted; matches the JSON-LD | 15 min |
| 2 | Add a sign/birthstone/flower sentence to the date About paragraph | Makes the top follow-up questions extractable on all 366 pages | 30-45 min incl. tests |
| 3 | Add `dateModified` to the date/month WebPage schema (and optionally a visible "Updated") | Freshness signal for Perplexity/AIO on data refreshed daily | 30 min |
| 4 | Add /llms.txt and a Wikidata credit in the source line | Site map for LLM agents; second named source on every date page | 45 min |
| 5 | At launch: Bing Webmaster Tools + IndexNow for changed boards, then YouTube/Reddit launch mentions and Organization `sameAs` | The authority dimension (the weakest) and ChatGPT/Copilot discovery | 2-4 h dev + ongoing marketing |

## Structured findings (for audit-data.json, category "AI Search Readiness")

```json
{
  "category": "AI Search Readiness",
  "score": 62,
  "dimensions": {"citability": 68, "structural_readability": 70, "multimodal": 35, "authority_brand": 45, "technical_accessibility": 85},
  "platform_scores": {"google_aio": 66, "chatgpt": 56, "perplexity": 62, "bing_copilot": 58},
  "crawlers": {"OAI-SearchBot": "allowed", "Claude-SearchBot": "allowed", "PerplexityBot": "allowed", "Googlebot": "allowed", "bingbot": "allowed", "Applebot": "allowed", "GPTBot": "allowed", "ClaudeBot": "allowed", "Google-Extended": "allowed", "Applebot-Extended": "allowed", "CCBot": "allowed", "cohere-ai": "allowed"},
  "llms_txt": "missing",
  "rsl": "missing",
  "brand_mentions": "not measurable (unlaunched)",
  "findings": [
    {"severity": "Medium", "title": "Famous-people 'Age N' is next-birthday age, contradicts JSON-LD birthDate", "evidence": "/october-7 'Shawn Ashmore ... Age 48' vs birthDate 1979-10-07; src/server/famous.ts:45", "fix": "Label 'Turns N on <date>'; separate spans"},
    {"severity": "Medium", "title": "Sign/birthstone/flower absent from date-page prose; dropped by trafilatura", "evidence": "extracted_text of /october-7 and /february-29 has no Libra/Opal/Marigold/Pisces", "fix": "Add one sentence to About paragraph in src/lib/about.ts"},
    {"severity": "Medium", "title": "No llms.txt", "evidence": "/llms.txt 404", "fix": "Add app/llms.txt route"},
    {"severity": "Low", "title": "No dateModified / visible freshness on date and month pages", "evidence": "No dateModified in JSON-LD; extractor guesses 2026-01-01", "fix": "Add dateModified in src/lib/seo.ts"},
    {"severity": "Low", "title": "Wikidata source not credited in visible text", "evidence": "0 visible mentions on /october-7", "fix": "Extend source line"},
    {"severity": "Low", "title": "Bare 'footballer' not normalised to 'soccer player'", "evidence": "/february-29 'Spanish footballer'", "fix": "Extend regex in src/lib/famous.ts:99 + test + refresh"},
    {"severity": "Low", "title": "Month list mixes 2026/2027 weekdays without year", "evidence": "/october '9 Sat October 9' next to '10 Sat October 10 Today'", "fix": "Show year on next-year rows"},
    {"severity": "Low", "title": "Fact cards not dl/dt/dd", "evidence": "span triples in About.tsx", "fix": "Use dl markup, same classes"},
    {"severity": "Info", "title": "All AI crawlers allowed (D14)", "evidence": "robots.txt User-Agent: * Allow: /", "fix": "Optional: block training-only bots"},
    {"severity": "Info", "title": "Brand mentions not measurable before launch", "evidence": "unlaunched", "fix": "YouTube/Reddit/Product Hunt launch, Organization sameAs"},
    {"severity": "Info", "title": "Local-only /_icon-options.html served", "evidence": "200, 324 KB, excluded via .git/info/exclude", "fix": "Remove from public/ before any CLI deploy"}
  ]
}
```

## Category score: 62 / 100
