# Content Quality: findings (seo-content)

Target: http://localhost:3100, a production build, audited 2026-10-10. Read-only.
Method: raw HTML via curl for all 382 sitemap URLs (366 dates, 12 months, `/`, `/how-it-works`, `/terms`, `/privacy`), plus
`render_page.py --mode never` for trafilatura `extracted_text` on 16 sample pages. The plugin scripts used were
`content_quality.py` (main text), `metadata_template.py --pairs-file` (all 382 title/description pairs) and `render_page.py`.
Uniqueness was measured with the same 3-word-shingle method as `seo-audit/audit.py`, plus a pairwise nearest-neighbour measure.
Facts were checked by script against Python `datetime` for every date page.

## Scores

| Item | Score |
|---|---|
| **Content quality (category score)** | **68 / 100** |
| E-E-A-T composite (skill weights 20/25/25/30) | 56 / 100 |
| - Experience (20%) | 50 |
| - Expertise (25%) | 70 |
| - Authoritativeness (25%) | 35 |
| - Trustworthiness (30%) | 65 |
| AI citation readiness | 72 / 100 |
| Templated metadata (`metadata_template.py`) | site_risk **low**, templated_ratio **0.0**, shared_cta_phrases **{}** |

## Measurements

### Word counts (`<main>` text, `[a-z0-9$#']+` tokens; trafilatura `extracted_text` in brackets)

| Page | Main words | Floor (skill) | Notes |
|---|---|---|---|
| `/` | 204 [110] | 500 homepage | Known and decided (client mockup copy) |
| `/how-it-works` | 450 [438] | 800 service-type | Answer-first FAQ with 10 Qs |
| `/terms` | 2,192 [2,137] | n/a | |
| `/privacy` | 1,523 [1,500] | n/a | |
| Month pages (12) | 636–675 | 500 | 64–70% strict-unique between months |
| Date pages (366) | min 323 / median 334 / max 684 (`/october-10`, today) | 300 (programmatic) | 0 pages under 300. Trafilatura keeps only 220–237 words (it drops the fact cards). `content_quality.py` counts 283–294 alphabetic tokens and flags `thin-content` (its floor is 300 tokens, numbers excluded) |

### Date-page uniqueness (re-measured now that famous people are filled for all 366 dates)

| Measure | Result |
|---|---|
| Strict (share of a page's 3-word shingles found on no other date page), as in `audit.py` | **avg 37.2%**, min 33.5%, max 77.3% (`/october-10`); 355/366 pages under 40% |
| Pairwise vs the most similar other page (the seo-programmatic definition, "unique between any two programmatic pages") | **avg 52.2%, min 48.2%** (`/april-20` vs `/april-27`); 0 pages under 40% |
| Boilerplate (shingles on 90%+ of date pages) | 31.7% of shingles (98 distinct shingles: board copy, labels, nav) |
| Where the rest comes from | 19.6% month name or number shingles shared with nearby dates ("born on october", "age 48"), 8.9% shared famous-person descriptions ("american actor"), 2.5% the "… Age" label |

Sample pages: `/january-1` 329 words, 39% strict, 52% pairwise · `/february-29` 328, 54%, 66% · `/july-4` 336, 39%, 55% · `/october-7` 334, 37%, 51% · `/october-10` 684, 77%, 85% · `/december-25` 338, 40%, 55%.

Filling in the famous people did **not** move the strict number (still ~37%, same as the known figure). Most of the remaining "non-unique" share is the date string inside sentence frames, not repeated content. On the plugin's own pairwise definition, every date page clears the 40% WARNING gate.

### Readability (Flesch, prose blocks of 6+ words)
`/` FRE 82 (grade 4) · `/how-it-works` FRE 88 (grade 3.6) · `/terms` FRE 63 (grade 9.1) · `/privacy` FRE 53 (grade 11.0). The legal pages are fine for legal text. On date and month pages the score is skewed by the name lists, but the About paragraph itself is short declarative sentences (about 15–18 words each).

### `content_quality.py` (main text)
overall_quality: home 91 · how-it-works 77 · terms 81 · privacy 80 · months 93 · dates 91 (today's date 94). filler_score 0 and ai_pattern_score 0 on every page, repetition 4–15. Only flag: `thin-content` on `/` and on the dates (token floor, see above).

### Fact check, all 366 date pages (script vs `datetime`)
Zodiac sign, weekday of the "Next one" date, day of year and half birthday (end-of-month clamping: Aug 31 → Feb 28, Oct 31 → Apr 30): **0 errors**. Deceased people are excluded at source (`MINUS { ?p wdt:P570 [] }` in `web/src/server/famous-source.ts`). 5,490 famous-person entries carry Wikidata `sameAs` and `birthDate` in JSON-LD.

## What works
- **Accurate, sourced, quotable facts.** Each date has a self-contained About paragraph with rank, births per year and % vs an average day, plus the citation "Source: FiveThirtyEight (CDC/NCHS, SSA), US births 1994–2014." All checked facts are correct.
- **Famous people now fill every date**: 10 with description + age, 5 more under "Also born on", mirrored in an `ItemList` of `Person` with Wikidata `sameAs`. This is strong entity grounding for AI engines.
- **No AI-slop markers**: filler and AI-pattern scores are 0 everywhere, and the copy is plain and specific. `/february-29` has its own wording ("It only comes once every four years… the rarest birthday of all").
- **Clean metadata**: 382 unique titles (max 58 chars) and 382 unique descriptions (131–160 chars). Each description leads with page-specific facts. `metadata_template.py`: 0 templated, site_risk low.
- **Month pages** have real depth (636–675 words, 64–70% unique between months): most and least common date, zodiac split, birthstone and flower, and the top two famous people for every date.
- **Trust content is thorough**: Terms has 24 numbered sections and Privacy covers GDPR, CCPA and minors. Both have a plain-language no-refund rule, a moderation and takedown route, and a contact email. Stripe is named, and "mybday.lol never touches the money" is stated on the homepage, How it works and Terms.
- **How it works** is answer-first: 10 short Q&As that match the Terms (e.g. "$5 for an open date… at least $1 more"). The live board on `/october-10` matches this ("Outrank Leo for $10" over $9).

## Findings

### High: "Age N" shows the age at the *next* birthday, which is wrong today on 365 of 366 date pages (2 years off on Feb 29)
Evidence: `/october-7` shows "Shawn Ashmore, Canadian actor **Age 48**", but JSON-LD `"birthDate":"1979-10-07"` makes him 47 on 2026-10-10. Same on that page for Simon Cowell (1959, shown 68, actually 67) and Lewis Capaldi (1996, shown 31, actually 30). `/december-25`: Jeremy Strong (1978) shows 48 and is 47 until Dec 25. `/february-29`: Ferran Torres (2000-02-29) shows **28** and is 26; Ja Rule (1976) shows 52 and is 50. The age is computed on purpose as `year - birthYear` for the board's year (`web/src/server/famous.ts:17,45`: "The age they turn on this date in the board's year"), but the label just says "Age". About 3,650 visible ages read as current ages and are wrong today. AI answer engines and readers will quote them as such, and QRG treats factual inaccuracy in main content as a low-quality trigger.
Fix: change the label to match the number, e.g. "Turns 48" or "Turns 48 on Oct 7, 2027" (cheapest, keeps the logic). Or show the current age ("Age 47"). If "Age" is mockup copy, flag it to the client as an accuracy fix (handle as a 07-open-questions item).

### Medium: date pages carry no date-specific context (holidays, why a date is rare), the biggest content gap and the best lever for uniqueness
Evidence: across all 366 date pages only one (`/june-12`) mentions any of "Christmas / Independence Day / New Year / Halloween / Valentine / holiday", and that one is incidental. `/december-25` says "It's the 365th most common birthday in the US… 41% fewer than on an average day" but never says Christmas. `/july-4` ("362nd… 21% fewer") never mentions Independence Day, and `/january-1` ("364th… 30% fewer") never mentions New Year's Day. The About paragraph follows one sentence frame on every page ("X is the Nth day of the year (N+1th in leap years). In YYYY it falls on a D. It's the Nth most common birthday… Famous X birthdays include A, B and C. Nobody has claimed…"). That is the template-with-variables pattern seo-programmatic warns about. It is why strict uniqueness stays at 37% even with famous people filled.
Fix: add one data-driven, date-specific block per page, for example (a) US federal holidays and widely known observances on that date, with the plain reason for a low or high rank (holidays have fewer scheduled C-sections and inductions; mid-September is the peak), or (b) 2–3 "on this day" historical events from Wikidata/Wikipedia. Also vary the About frame by rank band (top 10%, bottom 10%, holiday, leap day). Expect strict uniqueness to rise well past 40% without dropping word count.

### Medium: Privacy and Terms still show unfilled placeholders
Evidence: both pages render "Last updated: **[Launch date]**". `/privacy` also renders "**[If required: name and contact details of our representative in the EU and UK under Article 27 GDPR.]**" as visible body text. Raters and Stripe's review read visible bracket placeholders as an unfinished site (a Trust signal). The contact is a free mailbox (`mybdaylol@gmail.com`, also in Organization JSON-LD).
Fix: before launch, fill in the real date (and add `dateModified` on the pages), and either name the Art. 27 representative or remove the line if it's not required. 07-open-questions C2 already tracks the client's legal text. Consider a domain mailbox (e.g. hello@mybday.lol) once the domain is live.

### Medium: adult-industry performers appear in the famous lists of 30 date pages
Evidence: 30 entries with descriptions such as "American pornographic actress" or "American adult film performer". Examples: `/december-25` lists "Joanna Angel, American pornographic actress" at #8 of the top 10, ahead of Armin van Buuren. Others: `/march-17` Stormy Daniels, `/march-12` Ron Jeremy (a figure with a major criminal case, a reputational risk), `/december-31` Johnny Sins, `/april-9` Jenna Jameson, `/may-21` Belladonna and Briana Banks. This is a consumer birthday and gifting site that allows listings about minors (by a parent). Explicit occupation labels in main content are a brand-safety and trust problem and can affect SafeSearch-style classification of those URLs.
Fix: in the Wikidata query (`web/src/server/famous-source.ts`), exclude occupation P106 = pornographic actor (Q488111) and related subclasses, and/or any `knownFor` matching /pornograph|adult film/. Keep a small manual denylist (by QID) for convicted or notorious figures, and re-run `famous-refresh`.

### Medium: the February page and description contradict the leap-day page about the "rarest" birthday
Evidence: the `/february` intro says "the rarest is **February 13, 344th out of 366**", and its meta description says "its rarest is February 13". But the same page's grid shows "29 Tue February 29 … **Rarest birthday**", and `/february-29` says "#366 The rarest birthday of the year". Leap day is left out of the month's rarest calculation without saying so, which makes the page contradict itself.
Fix: either name Feb 29 as the rarest ("the rarest is February 29, leap day; among yearly dates it's February 13, 344th") or add "not counting leap day" to the sentence and the description.

### Low: date pages sit just above the floors, and trafilatura sees ~225 words
Evidence: main-text words min 323 / median 334. `content_quality.py` counts 283–294 alphabetic tokens and flags `thin-content` (<300). `render_page.py` `extracted_text` is 220–237 words because trafilatura drops the fact cards (Zodiac, Birthstone, Birth flower, Half birthday, Next one, Day of the year). Under the plugin's own extractor the cards don't count as main content.
Fix: the date-specific block in the Medium finding above fixes this too. Optionally give each fact card a one-sentence `<p>` (e.g. "People born on October 7 are Libras; Libra runs September 23 to October 22.") so extractors keep it as prose.

### Low: football labels are still mixed ("footballer" vs "soccer player"), often on the same page
Evidence: 398 descriptions on 239 date pages still say "footballer" or "football manager" ("French footballer" ×66, "English footballer" ×39, "Spanish footballer" ×29, …), next to 727 "soccer" labels. On `/january-1`, "Jack Wilshere, English soccer player" sits beside "Lilian Thuram, French footballer" and "Davor Šuker, Croatian footballer". Commit 9b11bd8 maps "association football player" but not the plain Wikidata "footballer".
Fix: extend `knownFor()` in `web/src/lib/famous.ts` to map `/\bfootballer\b/` → "soccer player" and "football manager" → "soccer manager", but not when "American football", "Australian rules" or "Gaelic" is in the label. Add a test and re-run the refresh.

### Low: 2 truncated famous-person descriptions
Evidence: `/january-1` "Sifan Hassan (Ethiopian-born Dutch **middle-**)" and `/september-19` "Jakob Asserson Ingebrigtsen, Norwegian **middle-**". The source is "middle- and long-distance runner", which gets cut at " and".
Fix: in the `knownFor` shortening, never end on a dangling hyphen. Fall back to the full label or trim to the last whole word ("Norwegian runner").

### Low: no About page and no Contact link in the footer (Authoritativeness / Trust)
Evidence: the footer is "FAQ · Terms · Privacy" (plus "Icons by Streamline"). The only operator identity is "an individual sole proprietor based in the United States" inside the legal pages. Organization JSON-LD has `email` but no `sameAs`, founder or address. Prelaunch, there are no external mentions to build authority on.
Fix: add a short `/about` page (who runs it, why, how boards and money work, the contact route) and a "Contact" footer link (both are design changes, so they need client sign-off; C2 already proposes "Terms · Privacy · Contact"). Add Organization `sameAs` once the social profiles exist.

### Low: no freshness signal on pages whose data changes daily
Evidence: date pages have no `datePublished`/`dateModified` in the `WebPage` JSON-LD, no `<time>`, and no visible "updated" note, even though famous people were refreshed today and boards change hourly. `render_page.py` falls back to `publication_date: 2026-01-01` for every date page (a guess from the © year).
Fix: emit `dateModified` (last board change or famous refresh) on date and month `WebPage`/`CollectionPage`. Optionally add a small "Famous birthdays from Wikidata, updated Oct 10, 2026" line next to the FiveThirtyEight source. That also credits the second data source in visible text (today Wikidata appears only in JSON-LD `sameAs`).

### Low: the duplicate "Nobody has claimed …" statement and the daily-changing WebSite description
Evidence: `/october-7` says "Nobody has claimed October 7 yet. The highest bid gets the homepage." in the board, then again in About ("Nobody has claimed October 7, 2027 on mybday.lol yet. The first bid takes the top spot from $5."), and a third time in the meta description. The home `WebSite.description` is the daily homepage line ("Today is October 10 and Jess Moreno owns it with $240…"), so the site-level entity description changes every day.
Fix: in About, swap the unclaimed sentence for a date-specific fact (see the Medium finding). Give `WebSite.description` a stable one-liner ("A birthday leaderboard: every date has a board, and the top bid owns the homepage.").

### Info: known and decided (context, not new bugs)
- Date pages ~37% unique on the strict 3-word comparison: re-measured at **37.2%** with famous people filled (unchanged). On the seo-programmatic pairwise definition they are **52% avg, 48% min**, so all pass the 40% gate.
- Homepage 204 words (client mockup copy): `content_quality.py` 91, flagged only `thin-content`.
- FAQPage schema on How it works is kept on purpose. The 10 Q&As are also good passages for AI engines to cite.
- Date and month titles have no brand suffix, on purpose (max title 58 chars).

## AI citation readiness: 72/100
+ The About paragraph is a self-contained, number-dense, sourced passage that answers "how common is an October 7 birthday" in one quotable block.
+ `ItemList` of `Person` with `birthDate` and Wikidata `sameAs`; BreadcrumbList; FAQPage answers on How it works; clean H1 → H2 → H3 on date pages.
− The "Age" label error (High) puts wrong numbers into the most quotable list.
− The fact cards have no headings or prose, so trafilatura-style extractors drop them.
− There is no question-style heading or answer for the obvious queries ("What holiday is on December 25?", "Is July 4 a rare birthday?").
− The Feb "rarest" contradiction.

## Structured findings (for audit-data.json, category "Content Quality")
```json
{
  "category": "Content Quality",
  "score": 68,
  "eeat": {"experience": 50, "expertise": 70, "authoritativeness": 35, "trustworthiness": 65, "composite": 56},
  "ai_citation_readiness": 72,
  "metadata_template": {"site_risk": "low", "templated_ratio": 0.0, "shared_cta_phrases": {}, "pages_checked": 382},
  "uniqueness": {"strict_avg": 37.2, "strict_min": 33.5, "pairwise_avg": 52.2, "pairwise_min": 48.2, "pages_under_40_strict": 355, "pages_under_40_pairwise": 0},
  "word_counts": {"home": 204, "how_it_works": 450, "terms": 2192, "privacy": 1523, "month_min": 636, "date_min": 323, "date_median": 334},
  "findings": [
    {"severity": "High", "id": "famous-age-label", "title": "\"Age N\" shows age at next birthday; wrong today on 365/366 date pages (2 years off on Feb 29)", "evidence": "/october-7 Shawn Ashmore 'Age 48', birthDate 1979-10-07 (47 today); /february-29 Ferran Torres 'Age 28' (26)", "fix": "Label 'Turns 48' or show current age"},
    {"severity": "Medium", "id": "no-date-context", "title": "No holiday or date-specific context; one sentence frame on all 366 About paragraphs", "evidence": "/december-25 never mentions Christmas; /july-4 never mentions Independence Day; 1/366 pages mention any holiday", "fix": "Add a data-driven holidays or on-this-day block; vary the frame by rank band"},
    {"severity": "Medium", "id": "legal-placeholders", "title": "'[Launch date]' and an Art. 27 GDPR placeholder render on the legal pages", "evidence": "/terms, /privacy 'Last updated: [Launch date]'; /privacy '[If required: ... Article 27 GDPR.]'", "fix": "Fill in before launch; remove the line if not required"},
    {"severity": "Medium", "id": "adult-famous", "title": "Adult performers in the famous lists on 30 date pages", "evidence": "/december-25 'Joanna Angel, American pornographic actress'; /march-12 Ron Jeremy; /march-17 Stormy Daniels", "fix": "Exclude P106=Q488111 and add a QID denylist in famous-source.ts"},
    {"severity": "Medium", "id": "feb-rarest-contradiction", "title": "/february says the rarest is Feb 13 while its own grid says Feb 29 is the rarest", "evidence": "'the rarest is February 13, 344th out of 366' vs '29 ... Rarest birthday'", "fix": "Name leap day or add 'not counting leap day'"},
    {"severity": "Low", "id": "date-near-floor", "title": "Date pages 323-334 words; trafilatura keeps ~225; content_quality thin-content flag", "fix": "Date-specific block; prose sentence per fact card"},
    {"severity": "Low", "id": "footballer-labels", "title": "398 'footballer' labels left beside 727 'soccer' labels", "fix": "Map \\bfootballer\\b to 'soccer player' in knownFor()"},
    {"severity": "Low", "id": "truncated-descriptions", "title": "2 descriptions end in 'middle-'", "evidence": "/january-1 Sifan Hassan; /september-19 Jakob Ingebrigtsen", "fix": "Never truncate on a hyphen"},
    {"severity": "Low", "id": "no-about-contact", "title": "No About page or Contact link; Organization has no sameAs", "fix": "Add /about and a Contact footer link (client sign-off)"},
    {"severity": "Low", "id": "no-freshness", "title": "No dateModified or visible update stamp on daily-changing pages", "fix": "Emit dateModified; add 'Wikidata, updated <date>' source line"},
    {"severity": "Low", "id": "dup-unclaimed-and-website-desc", "title": "'Nobody has claimed' appears 3 times per unclaimed page; WebSite.description changes daily", "fix": "Swap in a date fact; give WebSite a stable description"}
  ]
}
```
