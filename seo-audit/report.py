#!/usr/bin/env python3
"""
Client-facing before/after page from two audit.py runs.

  python report.py reports/before reports/after > reports/report.html

The page references its pictures relatively (screens/…, og/…) from the
reports/ folder. Written for the mybday.lol client, in the site's own look.
"""

from __future__ import annotations

import html
import json
import sys
from pathlib import Path

CATEGORIES = [
    ("Crawlability", "Can Google find every page? robots.txt, sitemap, links, click depth"),
    ("Indexability", "Will Google index the right pages? canonicals, noindex, 404s"),
    ("On-page", "Titles, descriptions and headings: length, uniqueness, templating"),
    ("Content", "Do the 366 date pages each say something of their own?"),
    ("Structured data", "Schema.org markup that explains the page to search engines"),
    ("Sharing", "Link previews on iMessage, WhatsApp, Facebook, X"),
    ("Security", "Basic security headers"),
]
SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def esc(text: object) -> str:
    return html.escape(str(text), quote=True)


def load(path: str) -> dict:
    return json.loads((Path(path) / "audit.json").read_text())


def chip(passed: bool | None) -> str:
    if passed is None:
        return '<span class="chip chip-na">new</span>'
    return '<span class="chip chip-pass">Pass</span>' if passed else '<span class="chip chip-fail">Fail</span>'


def score_rows(b: dict, a: dict) -> str:
    rows = []
    for cat, what in CATEGORIES:
        sb, sa = b["scores"][cat], a["scores"][cat]
        rows.append(f"""
      <div class="bar-row">
        <div class="bar-label"><strong>{esc(cat)}</strong><span>{esc(what)}</span></div>
        <div class="bars" role="img" aria-label="{esc(cat)}: {sb} before, {sa} after, out of 100">
          <div class="bar-track"><div class="bar bar-before" style="width:{sb}%"></div><span class="bar-num">{sb}</span></div>
          <div class="bar-track"><div class="bar bar-after" style="width:{sa}%"></div><span class="bar-num">{sa}</span></div>
        </div>
      </div>""")
    return "".join(rows)


def check_rows(b: dict, a: dict) -> str:
    before = {c["id"]: c for c in b["checks"]}
    after = {c["id"]: c for c in a["checks"]}
    ids = sorted(set(before) | set(after),
                 key=lambda i: (SEVERITY_ORDER[(after.get(i) or before[i])["severity"]], (after.get(i) or before[i])["category"], i))
    rows = []
    for i in ids:
        c = after.get(i) or before[i]
        rows.append(
            f"<tr><td>{esc(c['title'])}<small>{esc(c['source'])}</small></td>"
            f"<td>{esc(c['category'])}</td><td><span class=\"sev sev-{c['severity']}\">{esc(c['severity'])}</span></td>"
            f"<td>{chip(before[i]['passed'] if i in before else None)}</td>"
            f"<td>{chip(after[i]['passed'] if i in after else None)}</td>"
            f"<td class=\"num\">{esc((after.get(i) or {}).get('detail') or '')}</td></tr>"
        )
    return "\n".join(rows)


def sample_rows(b: dict, a: dict, path: str) -> str:
    sb, sa = b["sample_pages"].get(path, {}), a["sample_pages"][path]

    def fmt(v):
        if v in (None, "", []):
            return '<span class="muted">none</span>'
        if isinstance(v, list):
            return esc(", ".join(v))
        return esc(v)

    labels = {"title": "Title", "description": "Description", "words": "Words", "unique_pct": "Unique content",
              "schema": "Structured data", "og_image": "Share image"}
    out = []
    for key, label in labels.items():
        vb, va = sb.get(key), sa.get(key)
        if key == "unique_pct":
            vb = f"{vb}%" if vb is not None else None
            va = f"{va}%" if va is not None else None
        if key == "og_image":
            vb = "yes" if vb else None
            va = "yes" if va else None
        if key in ("title", "description") and sb.get("status") != 200:
            vb = f"page missing ({sb.get('status')})"
        out.append(f"<tr><th>{label}</th><td>{fmt(vb)}</td><td>{fmt(va)}</td></tr>")
    return "\n".join(out)


def main(before_dir: str, after_dir: str) -> str:
    b, a = load(before_dir), load(after_dir)
    before_checks = {c["id"]: c for c in b["checks"]}
    after_checks = {c["id"]: c for c in a["checks"]}
    fixed = sum(1 for i, c in after_checks.items() if c["passed"] and i in before_checks and not before_checks[i]["passed"])
    failing_after = [c for c in a["checks"] if not c["passed"]]
    still = "".join(
        f"<li><strong>{esc(c['title'])}</strong> <span class=\"sev sev-{c['severity']}\">{esc(c['severity'])}</span>"
        f"<br><span class=\"muted\">{esc(c['detail'])}. Examples: {esc(', '.join(c['failing'][:4]))}</span></li>"
        for c in sorted(failing_after, key=lambda c: SEVERITY_ORDER[c["severity"]])
    ) or "<li>None.</li>"
    run_day = a["run_at"][:10]

    return f"""<title>mybday.lol SEO Audit</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=IBM+Plex+Mono:wght@400;600&display=swap">
<style>
/* Layout: one reading column in the site's own neo-brutalist look (ink outlines, hard shadows, pastel grounds). Single light theme on purpose: it is the brand. */
:root {{
  color-scheme: light;
  --ink: #141414;
  --paper: #ffffff;
  --ground: #FFEC94;      /* Butter, the site's default */
  --after: #E4F5A1;       /* Lime */
  --before: #E6E8EE;      /* Cloud */
  --accent: #FF7AB8;
  --pass: #BDEFD0;        /* Mint */
  --fail: #FFC9C9;        /* Blush */
  --muted: #4d4a3f;
  --line: #e7e2c8;
  --display: "Bricolage Grotesque", "Arial Black", system-ui, sans-serif;
  --body: "Bricolage Grotesque", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
  --shadow: 6px 6px 0 var(--ink);
}}
* {{ box-sizing: border-box; }}
body {{ background: var(--ground); color: var(--ink); font-family: var(--body); font-size: 17px; line-height: 1.5; }}
.wrap {{ max-width: 1000px; margin: 0 auto; padding-inline: 20px; padding-block: 40px 80px; display: flex; flex-direction: column; gap: 56px; }}
h1, h2, h3 {{ font-family: var(--display); font-weight: 800; letter-spacing: -0.03em; line-height: 1.02; margin: 0; text-wrap: balance; }}
h1 {{ font-size: clamp(44px, 8vw, 96px); letter-spacing: -0.045em; }}
h2 {{ font-size: clamp(28px, 4vw, 40px); }}
h3 {{ font-size: 22px; letter-spacing: -0.02em; }}
p {{ margin: 0; max-width: 68ch; }}
.kicker {{ font-size: 13px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }}
.muted {{ color: var(--muted); }}
section {{ display: flex; flex-direction: column; gap: 18px; }}
.card {{ background: var(--paper); border: 3px solid var(--ink); border-radius: 22px; box-shadow: var(--shadow); padding: 24px; min-width: 0; }}
.hero {{ display: flex; flex-direction: column; gap: 18px; }}
.lead {{ font-size: 20px; max-width: 60ch; }}
.scores {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; }}
.score {{ display: flex; flex-direction: column; gap: 4px; }}
.score .big {{ font-family: var(--display); font-weight: 800; font-size: 88px; line-height: 0.9; letter-spacing: -0.05em; font-variant-numeric: tabular-nums; }}
.score .big small {{ font-size: 28px; letter-spacing: 0; }}
.score-before {{ background: var(--before); }}
.score-after {{ background: var(--after); }}
.score-delta {{ background: var(--ink); color: var(--paper); box-shadow: 6px 6px 0 var(--accent); }}
.bar-row {{ display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 16px; align-items: center; padding-block: 12px; border-top: 2px solid #efefef; }}
.bar-row:first-of-type {{ border-top: 0; }}
.bar-label {{ display: flex; flex-direction: column; gap: 2px; min-width: 0; }}
.bar-label span {{ font-size: 14px; color: var(--muted); }}
.bars {{ display: flex; flex-direction: column; gap: 6px; }}
.bar-track {{ position: relative; height: 22px; border: 2px solid var(--ink); border-radius: 999px; background: var(--paper); overflow: hidden; }}
.bar {{ height: 100%; border-right: 2px solid var(--ink); }}
.bar[style="width:0%"] {{ border-right: 0; }}
.bar-before {{ background: #c9ccd6; }}
.bar-after {{ background: #9fd36a; }}
.bar-num {{ position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font: 600 13px var(--mono); font-variant-numeric: tabular-nums; }}
.legend {{ display: flex; gap: 18px; flex-wrap: wrap; font-size: 14px; }}
.legend i {{ display: inline-block; width: 14px; height: 14px; border: 2px solid var(--ink); border-radius: 4px; vertical-align: -2px; margin-right: 6px; }}
.built {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }}
.built .card {{ display: flex; flex-direction: column; gap: 6px; box-shadow: 4px 4px 0 var(--ink); }}
.built p {{ font-size: 15px; color: var(--muted); }}
.pair {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; align-items: start; }}
figure {{ margin: 0; display: flex; flex-direction: column; gap: 8px; min-width: 0; }}
figure img {{ display: block; width: 100%; height: auto; border: 3px solid var(--ink); border-radius: 16px; background: var(--paper); }}
figcaption {{ font-size: 14px; color: var(--muted); }}
figcaption strong {{ color: var(--ink); }}
.empty-shot {{ aspect-ratio: 1.91 / 1; display: flex; align-items: center; justify-content: center; text-align: center; padding: 16px; border: 3px dashed var(--ink); border-radius: 16px; background: var(--before); font-weight: 600; }}
.og-grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }}
.table-scroll {{ overflow-x: auto; border: 3px solid var(--ink); border-radius: 18px; background: var(--paper); box-shadow: var(--shadow); }}
table {{ width: 100%; border-collapse: collapse; font-size: 15px; }}
th, td {{ text-align: left; vertical-align: top; padding: 10px 12px; border-top: 2px solid #efefef; }}
thead th {{ border-top: 0; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; background: var(--ink); color: var(--paper); }}
td small {{ display: block; font: 12px var(--mono); color: var(--muted); margin-top: 2px; }}
td.num {{ font: 13px var(--mono); white-space: nowrap; }}
.checks td:first-child {{ min-width: 260px; }}
.chip {{ display: inline-block; padding: 2px 10px; border: 2px solid var(--ink); border-radius: 999px; font-size: 13px; font-weight: 800; }}
.chip-pass {{ background: var(--pass); }}
.chip-fail {{ background: var(--fail); }}
.chip-na {{ background: var(--paper); }}
.sev {{ font: 600 12px var(--mono); text-transform: uppercase; letter-spacing: 0.06em; }}
.sev-critical {{ color: #a3122a; }}
.sev-high {{ color: #9a4a00; }}
.samples {{ display: grid; gap: 18px; }}
.samples table th {{ width: 140px; font-size: 14px; }}
.samples thead th:first-child {{ width: 140px; }}
ul.plain {{ margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 10px; max-width: 75ch; }}
.note {{ font-size: 15px; color: var(--muted); }}
code {{ font: 14px var(--mono); }}
a {{ color: var(--ink); text-underline-offset: 3px; }}
a:focus-visible {{ outline: 3px solid var(--accent); outline-offset: 2px; }}
@media (max-width: 640px) {{
  .wrap {{ gap: 44px; padding-block: 28px 60px; }}
  .bar-row {{ grid-template-columns: minmax(0, 1fr); gap: 8px; }}
  .pair, .og-grid {{ grid-template-columns: minmax(0, 1fr); }}
  .score .big {{ font-size: 72px; }}
}}
</style>

<div class="wrap">
  <header class="hero">
    <span class="kicker">mybday.lol · Step 9: SEO · {esc(run_day)}</span>
    <h1>SEO audit: {b['overall']} → {a['overall']}</h1>
    <p class="lead">We ran the same {len(a['checks'])} checks on every public page before and after the SEO work: all 366 birthday pages, the 12 month pages, the homepage, How it works, Terms and Privacy. {fixed} checks went from failing to passing.</p>
    <div class="scores">
      <div class="card score score-before"><span class="kicker">Before</span><span class="big">{b['overall']}<small>/100</small></span><span class="muted">No sitemap, no month pages, no link previews</span></div>
      <div class="card score score-after"><span class="kicker">After</span><span class="big">{a['overall']}<small>/100</small></span><span class="muted">{len(failing_after)} check{'s' if len(failing_after) != 1 else ''} left, listed below</span></div>
      <div class="card score score-delta"><span class="kicker">Change</span><span class="big">+{a['overall'] - b['overall']}</span><span>points, on {a['pages_crawled']} URLs checked</span></div>
    </div>
  </header>

  <section aria-labelledby="by-area">
    <h2 id="by-area">Score by area</h2>
    <div class="legend"><span><i style="background:#c9ccd6"></i>Before</span><span><i style="background:#9fd36a"></i>After</span></div>
    <div class="card">{score_rows(b, a)}
    </div>
  </section>

  <section aria-labelledby="built">
    <h2 id="built">What was built</h2>
    <div class="built">
      <div class="card"><h3>12 month pages</h3><p><code>/october</code> and the rest: every date with its top bid, its #1, how common it is and who was born that day. They link all 366 date pages, so Google can reach every one.</p></div>
      <div class="card"><h3>Real facts on every date</h3><p>How common the birthday is in the US (FiveThirtyEight births data, #1 to #366), half birthday, the weekday it falls on next, day of the year.</p></div>
      <div class="card"><h3>Famous birthdays</h3><p>Up to 15 living actors, musicians, athletes and creators per date, from Wikidata, ranked by Wikipedia views and refreshed every month. The admin screen (step 10) will let you hide anyone.</p></div>
      <div class="card"><h3>Titles and descriptions</h3><p>Written from each page's own data: who was born that day, how common it is, who leads the board. All 382 are unique and the right length for Google.</p></div>
      <div class="card"><h3>Link previews</h3><p>Every date, month and personal link shares a card in the person's colors with their photo and name, like the preview on the Success page.</p></div>
      <div class="card"><h3>Sitemap, robots.txt, structured data</h3><p>A sitemap of all 382 public pages with real update dates, breadcrumbs, and famous people linked to their Wikidata entries for Google and AI search.</p></div>
    </div>
  </section>

  <section aria-labelledby="look">
    <h2 id="look">See the difference</h2>
    <h3>A birthday page, under the board (October 7)</h3>
    <div class="pair">
      <figure><img src="screens/before/october-7-about.png" alt="October 7 About section before: three fact cards and nothing else" loading="lazy"><figcaption><strong>Before.</strong> Sign, stone and flower: the same three facts for every date in the month.</figcaption></figure>
      <figure><img src="screens/after/october-7-about.png" alt="October 7 About section after: facts paragraph, rank card, six fact cards and fifteen famous people" loading="lazy"><figcaption><strong>After.</strong> A paragraph of this date's own facts, the #118 rank card, six fact cards and the famous birthday list.</figcaption></figure>
    </div>
    <h3>The month page (/october)</h3>
    <div class="pair">
      <figure><img src="screens/before/october-desktop.png" alt="The October page before: a 404 Not Found page" loading="lazy"><figcaption><strong>Before.</strong> The "All October birthdays" link on every date page led to a 404.</figcaption></figure>
      <figure><img src="screens/after/october-top.png" alt="The new October page: intro, calendar with top bids, and the list of dates" loading="lazy"><figcaption><strong>After.</strong> The hub for the month, with a calendar of top bids and every date listed.</figcaption></figure>
    </div>
    <h3>What a shared link shows</h3>
    <div class="pair">
      <figure><div class="empty-shot">No preview image.<br>Shared links showed a bare URL.</div><figcaption><strong>Before.</strong> No share image on any page.</figcaption></figure>
      <figure><img src="og/home.png" alt="Share card for today: Jess Moreno on October 10, in the Lime theme" loading="lazy"><figcaption><strong>After.</strong> The homepage card follows today's #1 and changes when someone takes the spot.</figcaption></figure>
    </div>
    <div class="og-grid">
      <figure><img src="og/date-open.png" alt="Share card for an open date: September 30, up for grabs, claim it from $5" loading="lazy"><figcaption>An open date</figcaption></figure>
      <figure><img src="og/person.png" alt="Share card for a personal link: Jess Moreno's card" loading="lazy"><figcaption>A personal link</figcaption></figure>
      <figure><img src="og/month.png" alt="Share card for the October month page" loading="lazy"><figcaption>A month page</figcaption></figure>
      <figure><img src="og/how.png" alt="Share card for How it works: One birthday. The whole internet." loading="lazy"><figcaption>How it works</figcaption></figure>
    </div>
  </section>

  <section aria-labelledby="pages">
    <h2 id="pages">Three pages up close</h2>
    <div class="samples">
      <div class="table-scroll"><table><thead><tr><th>October 7</th><th>Before</th><th>After</th></tr></thead><tbody>{sample_rows(b, a, '/october-7')}</tbody></table></div>
      <div class="table-scroll"><table><thead><tr><th>October</th><th>Before</th><th>After</th></tr></thead><tbody>{sample_rows(b, a, '/october')}</tbody></table></div>
      <div class="table-scroll"><table><thead><tr><th>Homepage</th><th>Before</th><th>After</th></tr></thead><tbody>{sample_rows(b, a, '/')}</tbody></table></div>
    </div>
  </section>

  <section aria-labelledby="checks">
    <h2 id="checks">Every check</h2>
    <p class="muted">Most important first. The source line under each check names the rule it comes from.</p>
    <div class="table-scroll"><table class="checks"><thead><tr><th>Check</th><th>Area</th><th>Severity</th><th>Before</th><th>After</th><th>After, detail</th></tr></thead><tbody>
{check_rows(b, a)}
    </tbody></table></div>
  </section>

  <section aria-labelledby="open">
    <h2 id="open">Still open</h2>
    <div class="card"><ul class="plain">{still}</ul></div>
    <p class="note"><strong>About the 37%.</strong> The toolkit wants each generated page to be at least 40% different from its siblings, and stops treating it as a risk below 30%. Every date page carries the same board text from the mockup ("Own the top spot", "Bid on…", the card labels), so a 3-word comparison always counts that part as shared; the rest (the date's facts, rank and up to 15 people) is different on every page. Shortening the summary paragraph got the figure to 39% but pushed most pages under 300 words, so we kept the fuller version. What would close the gap is more writing per date, for example a short intro you write for the dates you care most about, or a holidays/events list per date. The homepage is the mockup's own copy, so its word count stays as designed.</p>
    <h3>Needs you</h3>
    <ul class="plain">
      <li><strong>Search Console.</strong> Add the site in Google Search Console and send us the HTML-tag verification code; we put it in the site settings and submit the sitemap.</li>
      <li><strong>A logo.</strong> The browser tab and Google results use a placeholder "b" until there's a logo.</li>
      <li><strong>Small design additions to confirm.</strong> The extra paragraph and fact cards on date pages, the "Birthdays by month" row in the footer, and the month page layout. Each is easy to remove if you prefer the mockup exactly.</li>
    </ul>
    <h3>After launch</h3>
    <ul class="plain">
      <li>Run the same audit on the live domain. It adds what a local test can't measure: HTTPS, page speed from real visitors (Core Web Vitals) and what Google has indexed.</li>
    </ul>
  </section>

  <section aria-labelledby="method">
    <h2 id="method">How this was measured</h2>
    <p class="note">The checks come from <a href="https://github.com/AgriciDaniel/claude-seo" target="_blank" rel="noopener">claude-seo</a> ({esc(a['claude_seo'])}), an open-source SEO toolkit: its own scripts read each page's title, description, headings, canonical, structured data and share tags, score content quality and spot templated metadata, and its written rules set the thresholds (titles 30–60 characters, descriptions 120–160, generated pages at least 40% unique and 300 words). Both runs used a production build of the site on test data, with the same pages and the same rules. Uniqueness compares every 3-word sequence on a date page's main content with all the other date pages. Scores weight each check by severity (critical 10, high 5, medium 3, low 1). These are the toolkit's rules of thumb, not Google's; they are a strong sign of how search engines will see the site, not a ranking promise.</p>
    <p class="note">Before: {esc(b['run_at'])}. After: {esc(a['run_at'])}. The full reports are in the repository under <code>seo-audit/reports/</code>.</p>
  </section>
</div>
"""


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: report.py BEFORE_DIR AFTER_DIR")
    print(main(sys.argv[1], sys.argv[2]))
