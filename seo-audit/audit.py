#!/usr/bin/env python3
"""
SEO audit for mybday.lol, built on claude-seo's analysers.

claude-seo (github.com/AgriciDaniel/claude-seo, MIT) is a Claude Code SEO
plugin. Its audits are mostly checklists that Claude follows; this script turns
the checklists that apply to this site into fixed, repeatable checks so a
"before" and an "after" run can be compared line by line. It calls the
plugin's own Python analysers for the parts it ships:

  parse_html.py         title, description, headings, canonical, OG, schema, images, links
  metadata_template.py  templated title/description pairs (seo-page, quality-gates.md)
  content_quality.py    QRG-aligned content quality score
  sitemap_discovery.py  sitemap found through robots.txt or common locations

and applies the thresholds from its skills: seo-page (on-page), seo-technical
(crawlability, indexability, security), seo-programmatic (unique content per
generated page, sitemap coverage, hub links), seo-schema and
seo/references/quality-gates.md (lengths, word counts).

Usage (needs a claude-seo checkout and its Python deps: bs4, lxml, requests,
trafilatura):

  CLAUDE_SEO_DIR=../claude-seo python audit.py http://localhost:3000 reports/after

It crawls every one of the 366 date pages and 12 month URLs, so run it against
a production build (`pnpm build && pnpm start`), not `pnpm dev`.
"""

from __future__ import annotations

import json
import os
import re
import sys
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse
from xml.etree import ElementTree

import requests
from bs4 import BeautifulSoup

SEO_DIR = Path(os.environ.get("CLAUDE_SEO_DIR", "../claude-seo")).resolve()
sys.path.insert(0, str(SEO_DIR / "scripts"))

from content_quality import analyse as content_quality  # noqa: E402
from metadata_template import analyse_pairs  # noqa: E402
from parse_html import parse_html  # noqa: E402

MONTHS = ["january", "february", "march", "april", "may", "june", "july",
          "august", "september", "october", "november", "december"]
DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
DATE_PATHS = [f"/{m}-{d}" for m, n in zip(MONTHS, DAYS) for d in range(1, n + 1)]
MONTH_PATHS = [f"/{m}" for m in MONTHS]
OTHER_INDEXABLE = ["/", "/how-it-works", "/terms", "/privacy"]
EXPECT_NOINDEX = ["/claim", "/claim?date=october-7", "/claim/success", "/unsubscribe"]

# Points per severity when a check fails (claude-seo reports Critical > High > Medium > Low).
WEIGHT = {"critical": 10, "high": 5, "medium": 3, "low": 1}
CATEGORIES = ["Crawlability", "Indexability", "On-page", "Content", "Structured data", "Sharing", "Security"]

# Schema types each page kind should carry (seo-schema: JSON-LD, active types only).
EXPECTED_SCHEMA = {
    "home": {"WebSite", "Organization"},
    "date": {"BreadcrumbList", "WebPage"},
    "month": {"BreadcrumbList", "CollectionPage"},
}
DEPRECATED_SCHEMA = {"HowTo", "SpecialAnnouncement", "ClaimReview", "VehicleListing", "EstimatedSalary",
                     "LearningVideo", "CourseInfo"}


@dataclass
class Check:
    id: str
    category: str
    severity: str
    title: str
    passed: bool
    detail: str = ""
    source: str = ""
    failing: list[str] = field(default_factory=list)


@dataclass
class Page:
    path: str
    kind: str
    status: int = 0
    location: str | None = None
    headers: dict = field(default_factory=dict)
    html: str = ""
    parsed: dict = field(default_factory=dict)
    main_text: str = ""
    lang: str | None = None
    viewport: bool = False
    schema_types: set = field(default_factory=set)
    schema_errors: int = 0


session = requests.Session()
session.headers["User-Agent"] = "Mozilla/5.0 (compatible; mybday-seo-audit/1.0; +claude-seo)"


def fetch(base: str, path: str, kind: str) -> Page:
    page = Page(path=path, kind=kind)
    r = session.get(urljoin(base, path), allow_redirects=False, timeout=60)
    page.status = r.status_code
    page.location = r.headers.get("location")
    page.headers = {k.lower(): v for k, v in r.headers.items()}
    if r.status_code == 200 and "html" in r.headers.get("content-type", ""):
        page.html = r.text
        page.parsed = parse_html(r.text, urljoin(base, path))
        soup = BeautifulSoup(r.text, "lxml")
        html_tag = soup.find("html")
        page.lang = html_tag.get("lang") if html_tag else None
        page.viewport = soup.find("meta", attrs={"name": "viewport"}) is not None
        main = soup.find("main") or soup.body
        for tag in main.find_all(["script", "style", "nav", "svg"]):
            tag.decompose()
        page.main_text = main.get_text(" ", strip=True)
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
            except json.JSONDecodeError:
                page.schema_errors += 1
                continue
            items = data.get("@graph", [data]) if isinstance(data, dict) else data
            for item in items:
                t = item.get("@type") if isinstance(item, dict) else None
                page.schema_types.update(t if isinstance(t, list) else [t] if t else [])
    return page


def words(text: str) -> list[str]:
    return re.findall(r"[a-z0-9$#']+", text.lower())


def shingles(text: str, n: int = 3) -> set[tuple]:
    w = words(text)
    return {tuple(w[i:i + n]) for i in range(len(w) - n + 1)}


def h1_count(page: Page) -> int:
    return len(page.parsed.get("h1", []))


def skipped_heading(page: Page) -> bool:
    soup = BeautifulSoup(page.html, "lxml")
    levels = [int(h.name[1]) for h in soup.find_all(re.compile(r"^h[1-6]$"))]
    return any(b > a + 1 for a, b in zip(levels, levels[1:]))


def run(base: str) -> dict:
    base = base.rstrip("/") + "/"
    origin = base.rstrip("/")
    checks: list[Check] = []

    def add(cid, category, severity, title, failing, total=None, detail="", source=""):
        failing = sorted(set(failing))
        if total is not None and not detail:
            detail = f"{total - len(failing)}/{total} pass"
        checks.append(Check(cid, category, severity, title, not failing, detail, source, failing[:12]))

    # ---- Fetch everything -------------------------------------------------
    targets = ([(p, "date") for p in DATE_PATHS] + [(p, "month") for p in MONTH_PATHS]
               + [("/", "home"), ("/how-it-works", "how"), ("/terms", "legal"), ("/privacy", "legal")]
               + [(p, "noindex") for p in EXPECT_NOINDEX])
    with ThreadPoolExecutor(8) as pool:
        pages = list(pool.map(lambda t: fetch(base, *t), targets))
    by_path = {p.path: p for p in pages}

    # A personal link from today's board (the date page lists them).
    person_path = None
    today_html = by_path["/"].html
    m = re.search(r'href="(/[a-z]+-\d+)"', today_html)
    if m and m.group(1) in by_path:
        # Row share menus build the link in the browser, so read the slug from the page's data payload.
        found = re.findall(r'slug\\*":\\*"([a-z0-9-]+)', by_path[m.group(1)].html)
        person_path = f"{m.group(1)}/{found[0]}" if found else None
    person = fetch(base, person_path, "person") if person_path else None

    indexable = [p for p in pages if p.kind in ("date", "month", "home", "how", "legal")]
    live = [p for p in indexable if p.status == 200]

    # ---- Crawlability -----------------------------------------------------
    add("status-200", "Crawlability", "critical", "Every public page (366 dates, 12 months, home, FAQ, legal) answers 200",
        [f"{p.path} → {p.status}" for p in indexable if p.status != 200], len(indexable),
        source="seo-technical §1")
    robots = session.get(base + "robots.txt", timeout=30)
    robots_ok = robots.status_code == 200 and "text/plain" in robots.headers.get("content-type", "")
    add("robots-exists", "Crawlability", "high", "robots.txt exists", [] if robots_ok else [f"/robots.txt → {robots.status_code}"],
        source="seo-technical §1")
    robots_txt = robots.text if robots_ok else ""
    add("robots-sitemap", "Crawlability", "medium", "robots.txt points to the sitemap",
        [] if re.search(r"(?im)^sitemap:\s*\S+", robots_txt) else ["no Sitemap: line"], source="seo-programmatic: Sitemap")
    blocked = []
    if robots_txt:
        star = re.split(r"(?im)^user-agent:\s*", robots_txt)
        rules = [b for b in star if b.strip().startswith("*")]
        dis = re.findall(r"(?im)^disallow:\s*(\S+)", rules[0]) if rules else []
        blocked = [p.path for p in indexable if any(p.path.startswith(d) for d in dis)]
        blocked += [f"{p} (noindex must stay crawlable)" for p in EXPECT_NOINDEX[:1] if any(p.startswith(d) for d in dis)]
    add("robots-not-blocking", "Crawlability", "critical", "robots.txt does not block pages that should be indexed or read",
        blocked, source="seo-technical §1")

    sitemap = session.get(base + "sitemap.xml", timeout=30)
    sm_urls: list[str] = []
    sm_lastmod = 0
    if sitemap.status_code == 200:
        try:
            root = ElementTree.fromstring(sitemap.content)
            ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
            sm_urls = [u.text for u in root.findall("s:url/s:loc", ns)]
            sm_lastmod = len(root.findall("s:url/s:lastmod", ns))
        except ElementTree.ParseError:
            pass
    add("sitemap-valid", "Crawlability", "high", "sitemap.xml exists and parses",
        [] if sm_urls else [f"/sitemap.xml → {sitemap.status_code}"], source="seo-sitemap")
    sm_paths = {urlparse(u).path or "/" for u in sm_urls}
    wanted = DATE_PATHS + MONTH_PATHS + ["/", "/how-it-works"]
    add("sitemap-complete", "Crawlability", "high", "Sitemap lists home, FAQ, all 366 dates and all 12 months",
        [p for p in wanted if p not in sm_paths], len(wanted), source="seo-programmatic: Sitemap")
    add("sitemap-clean", "Crawlability", "medium", "Sitemap holds no noindex, redirected or missing URLs",
        [p for p in sm_paths if p in by_path and (by_path[p].kind == "noindex" or by_path[p].status != 200)]
        + [p for p in sm_paths if p not in by_path and p not in ("/terms", "/privacy")],
        source="seo-programmatic: Sitemap")
    add("sitemap-lastmod", "Crawlability", "low", "Sitemap entries carry <lastmod>",
        [] if sm_urls and sm_lastmod == len(sm_urls) else [f"{sm_lastmod}/{len(sm_urls)} with lastmod"],
        source="seo-programmatic: Sitemap")
    try:
        from sitemap_discovery import discover_sitemaps
        os.environ.setdefault("CLAUDE_SEO_LOCAL_TARGETS", urlparse(base).netloc)
        disc = discover_sitemaps(base)
        disc_found = bool(disc.get("found"))
        disc_note = "; ".join(disc.get("warnings", [])[:2])
    except Exception as exc:  # the plugin refuses some local fetches; report, don't crash
        disc_found, disc_note = False, f"sitemap_discovery error: {exc}"
    add("sitemap-discovery", "Crawlability", "medium", "claude-seo sitemap_discovery finds a valid sitemap",
        [] if disc_found else [disc_note or "nothing found"], source="sitemap_discovery.py")

    month_fail = []
    for i, mp in enumerate(MONTH_PATHS):
        mpage = by_path[mp]
        hrefs = {urlparse(l["href"]).path for l in mpage.parsed.get("links", {}).get("internal", [])}
        missing = [p for p in DATE_PATHS if p.startswith(f"/{MONTHS[i]}-") and p not in hrefs]
        if mpage.status != 200 or missing:
            month_fail.append(f"{mp} ({'status ' + str(mpage.status) if mpage.status != 200 else f'{len(missing)} dates unlinked'})")
    add("hub-links", "Crawlability", "high", "Each month page (hub) links to every date in it",
        month_fail, 12, source="seo-programmatic: Internal Linking (hub/spoke)")

    # Click depth from the homepage over the crawled set (BFS on internal links).
    graph = {p.path: {urlparse(l["href"]).path or "/" for l in p.parsed.get("links", {}).get("internal", [])}
             for p in pages if p.parsed}
    depth = {"/": 0}
    queue = ["/"]
    while queue:
        cur = queue.pop(0)
        for nxt in graph.get(cur, ()):
            if nxt not in depth and nxt in graph:
                depth[nxt] = depth[cur] + 1
                queue.append(nxt)
    deep = [f"{p} (depth {depth.get(p, '∞')})" for p in DATE_PATHS + MONTH_PATHS if depth.get(p, 99) > 3]
    add("click-depth", "Crawlability", "high", "Every date and month page is within 3 clicks of the homepage",
        deep, len(DATE_PATHS) + 12, source="seo-technical §1 (crawl depth)")

    links = sorted({urlparse(l["href"]).path for p in pages for l in p.parsed.get("links", {}).get("internal", [])
                    if not l["href"].startswith(("mailto:", "tel:", "sms:"))})
    unknown = [l for l in links if l not in by_path]
    with ThreadPoolExecutor(8) as pool:
        statuses = dict(zip(unknown, pool.map(lambda l: session.get(base.rstrip("/") + l, allow_redirects=True, timeout=60).status_code, unknown)))
    broken = [f"{l} → {by_path[l].status if l in by_path else statuses[l]}" for l in links
              if (by_path[l].status if l in by_path else statuses[l]) >= 400]
    add("internal-links", "Crawlability", "high", "No internal link leads to an error page", broken, len(links),
        source="seo-page: Internal links")

    legacy = session.get(base + "oct-7", allow_redirects=False, timeout=30)
    add("legacy-redirect", "Crawlability", "low", "Old /oct-7 share links redirect permanently to /october-7",
        [] if legacy.status_code in (301, 308) and legacy.headers.get("location", "").endswith("/october-7")
        else [f"/oct-7 → {legacy.status_code}"], source="seo-technical §4 (301, one hop)")

    # ---- Indexability -----------------------------------------------------
    add("index-allowed", "Indexability", "critical", "Public pages are not noindex",
        [p.path for p in live if "noindex" in (p.parsed.get("meta_robots") or "") + p.headers.get("x-robots-tag", "")],
        len(live), source="seo-technical §2")
    add("noindex-private", "Indexability", "medium", "Claim, checkout result and unsubscribe pages are noindex",
        [p.path for p in pages if p.kind == "noindex" and "noindex" not in (p.parsed.get("meta_robots") or "")],
        len(EXPECT_NOINDEX), source="06-seo.md + seo-technical §2")
    canon_fail = []
    for p in live:
        c = p.parsed.get("canonical")
        if not c or urlparse(c).path.rstrip("/") != p.path.rstrip("/") or not c.startswith("http"):
            canon_fail.append(f"{p.path} → {c}")
    add("canonical-self", "Indexability", "high", "Every public page has an absolute, self-referencing canonical",
        canon_fail, len(live), source="seo-programmatic: Canonical Strategy")
    if person:
        pc = person.parsed.get("canonical") or ""
        add("canonical-person", "Indexability", "medium", "Personal links canonicalise to their date page",
            [] if urlparse(pc).path == person.path.rsplit("/", 1)[0] else [f"{person.path} → {pc}"],
            source="seo-technical §2 (duplicates)")
    bogus = [p for p in ["/february-30", "/not-a-date", "/october-0"]
             if session.get(base.rstrip("/") + p, allow_redirects=False, timeout=30).status_code != 404]
    add("soft-404", "Indexability", "medium", "Impossible dates answer 404, not a page", bogus, 3,
        source="seo-technical §2")
    add("lang-viewport", "Indexability", "medium", "Pages declare a language and a mobile viewport",
        [p.path for p in live if not p.lang or not p.viewport], len(live), source="seo-technical §5")

    # ---- On-page ------------------------------------------------------------
    titles = {p.path: (p.parsed.get("title") or "") for p in live}
    descs = {p.path: (p.parsed.get("meta_description") or "") for p in live}
    add("title-present", "On-page", "critical", "Every page has a title", [k for k, v in titles.items() if not v], len(live),
        source="quality-gates.md")
    add("title-length", "On-page", "medium", "Titles are 30–60 characters (Google truncates around 60)",
        [f"{k} ({len(v)})" for k, v in titles.items() if not 30 <= len(v) <= 60], len(live), source="quality-gates.md")
    dup_t = [v for v, n in Counter(titles.values()).items() if n > 1]
    add("title-unique", "On-page", "high", "Titles are unique", [k for k, v in titles.items() if v in dup_t], len(live),
        source="quality-gates.md")
    add("desc-present", "On-page", "high", "Every page has a meta description", [k for k, v in descs.items() if not v],
        len(live), source="quality-gates.md")
    add("desc-length", "On-page", "low", "Descriptions are 120–160 characters",
        [f"{k} ({len(v)})" for k, v in descs.items() if v and not 120 <= len(v) <= 160], len(live), source="quality-gates.md")
    dup_d = [v for v, n in Counter(descs.values()).items() if n > 1 and v]
    add("desc-unique", "On-page", "high", "Descriptions are unique", [k for k, v in descs.items() if v in dup_d], len(live),
        source="quality-gates.md")
    tm = analyse_pairs([{"url": k, "title": titles[k], "description": descs[k]} for k in titles if descs[k]])
    flagged = [p["url"] for p in tm.get("pages", []) if p.get("flags")]
    add("desc-not-templated", "On-page", "medium",
        f"Descriptions don't restate the title (metadata_template site_risk: {tm.get('site_risk', '?')})",
        flagged, len(titles), source="metadata_template.py")
    add("one-h1", "On-page", "high", "Exactly one H1 per page", [f"{p.path} ({h1_count(p)})" for p in live if h1_count(p) != 1],
        len(live), source="seo-page")
    add("heading-order", "On-page", "low", "Heading levels don't skip (H2 → H4)",
        [p.path for p in live if skipped_heading(p)], len(live), source="seo-page")

    # ---- Content ------------------------------------------------------------
    gen = [p for p in live if p.kind in ("date", "month")]
    add("thin-programmatic", "Content", "medium", "Date and month pages have 300+ words of main content",
        [f"{p.path} ({len(words(p.main_text))})" for p in gen if len(words(p.main_text)) < 300], len(gen),
        source="seo-programmatic: Quality Gates (<300 words)")
    sh = {p.path: shingles(p.main_text) for p in gen if p.kind == "date"}
    owners = Counter(s for v in sh.values() for s in v)
    uniq = {k: (100 * sum(1 for s in v if owners[s] == 1) / len(v) if v else 0) for k, v in sh.items()}
    low = [f"{k} ({v:.0f}%)" for k, v in sorted(uniq.items(), key=lambda kv: kv[1]) if v < 40]
    avg_unique = sum(uniq.values()) / len(uniq) if uniq else 0
    add("unique-content", "Content", "critical" if avg_unique < 30 else "high",
        f"Date pages are ≥40% unique (average {avg_unique:.0f}%, measured on 3-word sequences in the main content)",
        low, len(uniq), source="seo-programmatic: Thin Content Safeguards")
    qual = {p.path: content_quality(p.main_text)["overall_quality"] for p in live if p.main_text}
    add("content-quality", "Content", "low", "content_quality.py scores 60+ on main content",
        [f"{k} ({v})" for k, v in qual.items() if v < 60], len(qual), source="content_quality.py")
    home_words = len(words(by_path["/"].main_text))
    add("home-words", "Content", "low", f"Homepage explains itself in 500+ words ({home_words} now)",
        [] if home_words >= 500 else [f"/ ({home_words})"], source="quality-gates.md (homepage)")

    # ---- Structured data ----------------------------------------------------
    add("schema-valid", "Structured data", "critical", "All JSON-LD blocks parse",
        [p.path for p in live if p.schema_errors], len(live), source="seo-schema")
    for kind, types in EXPECTED_SCHEMA.items():
        kp = [p for p in live if p.kind == kind]
        add(f"schema-{kind}", "Structured data", "medium",
            f"{kind.capitalize()} pages carry {' + '.join(sorted(types))}",
            [f"{p.path} (has {', '.join(sorted(p.schema_types)) or 'none'})" for p in kp if not types <= p.schema_types],
            len(kp), source="seo-schema / schema-types.md")
    add("schema-deprecated", "Structured data", "high", "No deprecated schema types (HowTo, SpecialAnnouncement…)",
        [p.path for p in live if p.schema_types & DEPRECATED_SCHEMA], len(live), source="deprecated-types-2024-2026.md")

    # ---- Sharing ------------------------------------------------------------
    share_pages = [p for p in live if p.kind in ("home", "date", "month", "how")]
    add("og-tags", "Sharing", "high", "Open Graph title, description, url and image on every shareable page",
        [p.path for p in share_pages if not all(p.parsed.get("open_graph", {}).get(k) for k in
                                                ("og:title", "og:description", "og:url", "og:image"))],
        len(share_pages), source="seo-page: Technical Elements")
    add("twitter-card", "Sharing", "low", "Twitter/X card is summary_large_image",
        [p.path for p in share_pages if p.parsed.get("twitter_card", {}).get("twitter:card") != "summary_large_image"],
        len(share_pages), source="seo-page: Technical Elements")
    sample = ["/", "/october-7", "/february-29", "/december-25", "/october", "/how-it-works"]
    img_fail = []
    for path in sample + ([person.path] if person else []):
        p = person if person and path == person.path else by_path.get(path)
        img = (p.parsed.get("open_graph", {}) if p and p.parsed else {}).get("og:image")
        if not img:
            img_fail.append(f"{path} (no og:image)")
            continue
        r = session.get(img, timeout=60)
        if r.status_code != 200 or not r.headers.get("content-type", "").startswith("image/"):
            img_fail.append(f"{path} → {r.status_code} {r.headers.get('content-type')}")
    add("og-image-loads", "Sharing", "high", "Share images load (sampled: home, 3 dates, a month, FAQ, a personal link)",
        img_fail, len(sample) + (1 if person else 0), source="06-seo.md (OG image per date)")
    if person:
        og = person.parsed.get("open_graph", {})
        own = og.get("og:image", "") and og.get("og:image") != by_path[person.path.rsplit("/", 1)[0]].parsed.get("open_graph", {}).get("og:image")
        add("og-person", "Sharing", "medium", "Personal links share their own card (handoff v2)",
            [] if own else [person.path], source="Handoff v2 / 06-seo.md")

    # ---- Security (headers; HTTPS/HSTS come from Vercel in production) ------
    h = by_path["/"].headers
    for name, sev in (("x-content-type-options", "low"), ("referrer-policy", "low")):
        add(f"hdr-{name}", "Security", sev, f"{name} header", [] if name in h else ["missing"], source="seo-technical §3")
    frame = "x-frame-options" in h or "frame-ancestors" in h.get("content-security-policy", "")
    add("hdr-framing", "Security", "low", "Clickjacking protection (X-Frame-Options or CSP frame-ancestors)",
        [] if frame else ["missing"], source="seo-technical §3")

    # ---- Scores -------------------------------------------------------------
    scores = {}
    for cat in CATEGORIES:
        cs = [c for c in checks if c.category == cat]
        total = sum(WEIGHT[c.severity] for c in cs)
        scores[cat] = round(100 * sum(WEIGHT[c.severity] for c in cs if c.passed) / total) if total else 100
    total = sum(WEIGHT[c.severity] for c in checks)
    overall = round(100 * sum(WEIGHT[c.severity] for c in checks if c.passed) / total)

    sample_pages = {}
    for path in ["/", "/october-7", "/february-29", "/december-25", "/october", "/how-it-works"]:
        p = by_path[path]
        sample_pages[path] = {
            "status": p.status,
            "title": p.parsed.get("title"),
            "description": p.parsed.get("meta_description"),
            "canonical": p.parsed.get("canonical"),
            "h1": " ".join(BeautifulSoup(p.html, "lxml").h1.get_text(" ", strip=True).split()) if p.html and BeautifulSoup(p.html, "lxml").h1 else None,
            "words": len(words(p.main_text)),
            "unique_pct": round(uniq.get(path, 0)) if path in uniq else None,
            "schema": sorted(p.schema_types),
            "og_image": p.parsed.get("open_graph", {}).get("og:image"),
        }
    return {
        "base": origin,
        "run_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "claude_seo": json.loads((SEO_DIR / ".claude-plugin" / "plugin.json").read_text())["version"],
        "overall": overall,
        "scores": scores,
        "checks": [asdict(c) for c in checks],
        "pages_crawled": len(pages) + (1 if person else 0) + len(unknown),
        "date_unique_avg": round(avg_unique, 1),
        "sample_pages": sample_pages,
        "person_path": person.path if person else None,
    }


def bar(score: int) -> str:
    return "█" * round(score / 10) + "░" * (10 - round(score / 10))


def markdown(r: dict, label: str) -> str:
    out = [f"# SEO audit: mybday.lol ({label})", "",
           f"Run {r['run_at']} against `{r['base']}` with claude-seo {r['claude_seo']} analysers. "
           f"{r['pages_crawled']} URLs fetched.", "",
           f"## Overall score: {r['overall']}/100", "", "```"]
    out += [f"{cat:<16} {r['scores'][cat]:>3}/100  {bar(r['scores'][cat])}" for cat in CATEGORIES]
    out += ["```", ""]
    by_sev = defaultdict(list)
    for c in r["checks"]:
        if not c["passed"]:
            by_sev[c["severity"]].append(c)
    out += ["## Failing checks", ""]
    if not any(by_sev.values()):
        out += ["None.", ""]
    for sev in ("critical", "high", "medium", "low"):
        if by_sev[sev]:
            out += [f"### {sev.capitalize()}", ""]
            for c in by_sev[sev]:
                eg = ", ".join(f"`{f}`" for f in c["failing"][:6])
                out.append(f"- **{c['title']}** ({c['category']}; {c['detail'] or 'fail'}). {('E.g. ' + eg) if eg else ''}"
                           f" _Source: {c['source']}_")
            out.append("")
    out += ["## All checks", "", "| | Check | Category | Severity | Result |", "|---|---|---|---|---|"]
    for c in r["checks"]:
        out.append(f"| {'✅' if c['passed'] else '❌'} | {c['title']} | {c['category']} | {c['severity']} | {c['detail'] or ('pass' if c['passed'] else 'fail')} |")
    out += ["", "## Sample pages", ""]
    for path, s in r["sample_pages"].items():
        out += [f"### `{path}`", "", "| Field | Value |", "|---|---|"]
        for k, v in s.items():
            out.append(f"| {k} | {v if v not in (None, '', []) else '—'} |")
        out.append("")
    return "\n".join(out)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: audit.py BASE_URL OUT_DIR")
    base, out_dir = sys.argv[1], Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    result = run(base)
    (out_dir / "audit.json").write_text(json.dumps(result, indent=2, default=list))
    (out_dir / "AUDIT.md").write_text(markdown(result, out_dir.name))
    print(f"overall {result['overall']}/100 ", json.dumps(result["scores"]))
