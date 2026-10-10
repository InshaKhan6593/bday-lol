# Handoff: run the real claude-seo audit

For the Claude Code agent on the developer's machine. Goal: audit the site with the **claude-seo plugin itself**
(github.com/AgriciDaniel/claude-seo, MIT), not with `audit.py` in this folder.

## Why this wasn't done already

Step 9 was built in a cloud session where installing the plugin was refused: `install.sh` writes 26 skills and
19 agents into `~/.claude/` and adds a hook that runs after every edit, and that session wasn't allowed to change
Claude's own setup. So `audit.py` was written instead: it calls the plugin's own Python scripts (`parse_html`,
`metadata_template`, `content_quality`, `sitemap_discovery`) and applies the thresholds from its skills as 44 fixed
checks, so the before/after runs are comparable (46 → 97, `reports/`). The real `/seo audit` is Claude following
`skills/seo-audit/SKILL.md` with up to 17 sub-agents: it adds the judgment parts (E-E-A-T, AI search readiness,
page experience), its own scoring and a PDF. That's what's wanted now.

## Don't touch

`private/`, `resources/` and `01-client-and-deal.md` are the client's confidential material. They are git-ignored
and must never be committed, moved or deleted. The repo is public.

## 1. Get the app running with full data

```bash
cd web
pnpm install
cp -n .env.example .env.local        # keep an existing .env.local
pnpm db:up && pnpm db:migrate         # step 9 added no migrations; safe to run
pnpm db:seed                          # demo people on today's date (ET)
pnpm famous:refresh                   # famous people for all 366 dates, ~1 hour (Wikidata is slow)
```

`famous:refresh` matters: without it the date pages have no famous people and score far lower on content.
`pnpm famous:refresh 10` does one month if time is short (then audit October pages only).
A day that fails (Wikidata 429/504) keeps its old list; just run that month again.

In production mode the app refuses the placeholder `APP_SECRET`: set a random 32+ character one in `.env.local`
(`openssl rand -hex 24`), or `/unsubscribe` answers 500.

```bash
pnpm build && pnpm start              # audit a production build, not pnpm dev
```

## 2. Install the plugin (needs the user's OK: it changes Claude's own setup)

```
/plugin marketplace add AgriciDaniel/claude-seo
/plugin install claude-seo@agricidaniel-claude-seo
/seo setup                            # isolated Python env + Chromium
/seo doctor
```

The plugin refuses private addresses unless allowed. Start Claude Code from a shell with:

```bash
export CLAUDE_SEO_LOCAL_TARGETS=localhost:3000
```

Only the first URL of each command may be local; its headless browser won't render local pages, so it reads raw
HTML. That's fine here: every page is server-rendered.

## 3. Run

```
/seo audit http://localhost:3000
/seo programmatic http://localhost:3000/october-7
/seo page http://localhost:3000/october-7
/seo page http://localhost:3000/october
/seo schema http://localhost:3000/october-7
/seo technical http://localhost:3000
/seo sitemap http://localhost:3000/sitemap.xml
/seo geo http://localhost:3000/october-7
```

A full `/seo audit` runs several agents on Opus: it costs more than the single-page commands.

Save every report under `seo-audit/reports/claude-seo/<YYYY-MM-DD>/` (one file per command, plus the PDF if made).

## 4. What to expect (so findings can be checked, not just copied)

Known and decided, not bugs:

- **Date pages ~37% unique** on a strict 3-word comparison (plugin warns under 40%, hard stop under 30%). The
  mockup's board copy repeats on all 366 pages. Trimming our paragraph reached 39% but dropped pages under 300
  words; the fuller version was kept. See 07 D9.
- **Homepage ~204 words** (plugin likes 500): it's the mockup's own copy.
- **FAQPage** on How it works: Google retired FAQ rich results in May 2026. Kept on purpose; the plugin itself
  says not to remove it.
- **No HTTPS/HSTS, no Core Web Vitals, no Search Console data** locally: those need the live site
  (`/seo audit https://mybday.lol` after launch) and Google credentials (`/seo google setup`).
- **Title brand suffix**: date and month titles leave out "| mybday.lol" on purpose to stay under 60 characters.
- **AI crawlers** are all allowed in `robots.txt` (07 D14, the client's call).

Treat each other finding as a claim to verify: trace it to the page, fix it if it's real and in proportion, and
re-run `audit.py` afterwards (`README.md` here) so the comparable score is kept up to date.

## 5. Where things are

Implementation map: `06-seo.md` → "Built (step 9)". Decisions waiting on the client: `07-open-questions.md` D9–D14.
