# SEO audit

A repeatable SEO audit of the site, built on [claude-seo](https://github.com/AgriciDaniel/claude-seo) (MIT): its
Python analysers (`parse_html`, `metadata_template`, `content_quality`, `sitemap_discovery`) plus the thresholds from
its skills, turned into 44 fixed checks over all 366 date pages, the 12 month pages and the other public pages.

| File | What |
|---|---|
| `audit.py` | Runs the checks against a running site, writes `AUDIT.md` + `audit.json` |
| `compare.py` | Before/after table from two runs (`reports/COMPARISON.md`) |
| `report.py` | The client page from two runs (`reports/report.html`, pictures in `reports/screens` and `reports/og`) |
| `reports/before`, `reports/after` | Step 9: 46/100 → 97/100 |
| [`HANDOFF-claude-seo.md`](HANDOFF-claude-seo.md) | **Next:** run the real claude-seo plugin (`/seo audit`) on a local machine |

## Run it

The plugin's installer isn't needed: clone it and give the scripts their dependencies in a separate virtualenv.

```bash
git clone --depth 1 https://github.com/AgriciDaniel/claude-seo ../claude-seo
python3 -m venv .venv && .venv/bin/pip install beautifulsoup4 lxml lxml_html_clean requests trafilatura
cd ../web && pnpm build && pnpm start          # audit a production build, not pnpm dev
cd ../seo-audit && CLAUDE_SEO_DIR=../claude-seo CLAUDE_SEO_LOCAL_TARGETS=localhost:3000 \
  .venv/bin/python audit.py http://localhost:3000 reports/next
python3 compare.py reports/after reports/next > reports/COMPARISON-next.md
```

After launch, run it against `https://mybday.lol` (no `CLAUDE_SEO_LOCAL_TARGETS` needed).
