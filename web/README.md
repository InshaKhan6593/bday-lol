# bday.lol (web app)

Next.js (App Router) + TypeScript + Postgres (Drizzle). The product brief lives one folder up (`../README.md`).

## Run it locally

Needs Node 22+, pnpm, and Docker Desktop.

```bash
pnpm install
cp .env.example .env.local      # local defaults already work
pnpm db:up                      # Postgres on :5440, Mailpit on :8030
pnpm db:migrate                 # create tables
pnpm db:seed                    # mockup demo data on today's date (ET)
pnpm dev                        # http://localhost:3000
```

| URL | What |
|---|---|
| http://localhost:3000 | The app |
| http://localhost:3000/styleguide | The design language (dev only) |
| http://localhost:8030 | Mailpit: every email the app sends lands here |
| `pnpm db:studio` | Browse the database |

## Scripts

| Script | Does |
|---|---|
| `pnpm test` | Unit tests + database tests (`*.db.test.ts`, need `pnpm db:up`; they roll back, so seed data is untouched) |
| `pnpm typecheck` / `pnpm lint` | Static checks |
| `pnpm db:generate` | New migration from `src/db/schema.ts` changes |
| `pnpm db:reset` | Wipe the local DB, migrate, seed (refuses non-local databases) |

## Fake clock

Set `DEV_NOW` (ISO 8601) to make the app think it's that moment. Ignored in production.

```bash
DEV_NOW=2026-10-07T23:58:00-04:00 pnpm db:reset   # 2 minutes before Oct 7 ends (ET)
DEV_NOW=2028-02-27T12:00:00-05:00 pnpm db:reset   # Feb 29, 2028 is "coming up"
```

## Where things live

```
src/
  app/                 routes (pages, API, cron)
  components/ui/       design-language primitives: Button, Chip, Surface, Avatar, Badge, Kicker, Field, Select, Menu, Icon…
  components/site/     shared by every page: header, menu, countdown
  components/home/     homepage sections
  components/date/     date page ("Find your birthday"): date picker, ranked list, gift menu, About
  components/how/      How it works page styles
  components/claim/    Claim form: photo picker, gift links, color swatches
  components/success/  Success page styles + "Finishing up…" poller
  components/boost/    the Boost box (homepage + date page)
  components/share/    share and copy-link buttons, shared-link card
  config/              themes (12), board type settings (min bid, min boost, time zone…)
  db/                  schema.ts (board → entries → payments model), client
  lib/                 pure rules: birthday.ts (ET, leap years, board years), date-page, claim, success, facts, money, boost math, gifts, routes, clock, ids
  test/                database test helpers (rolled-back transactions)
  server/              server logic: leaderboard queries, homepage + date page data, famous people, reminders; actions/ = form actions
  styles/tokens.css    design tokens: color, type roles, shape, shadows, spacing, motion
scripts/               seed, reset
drizzle/               generated SQL migrations
```

## Design language

The UI follows the client's mockup ("Birthday Bid Mockup"), a **neo-brutalist** style. The rules are written
at the top of `src/styles/tokens.css`. Components use **tokens and primitives, never raw values**:

- color only from the theme: `--ground` and `--accent`, set by `<ThemeScope>` (fades in 0.3s)
- ink outlines (`--border`), hard shadows (`--shadow-hero/section/menu/lift`), radii by role (`--radius-hero/card/control…`)
- type by role (`--text-body`, `--text-title`, `--text-display`…), Bricolage Grotesque 400/600/800
- the `lift` class gives every clickable the hover lift and press (mouse devices only)

Decided (2026-10-09): keep the **client's look** exactly: rounded pastel shapes and Bricolage Grotesque.
We compared it with neubrutalism.com's square style and its fonts (Syne is too wide for the giant homepage date).
Two upgrades over the mockup:
- **Icons:** [Phosphor](https://phosphoricons.com), Bold weight, via `<Icon name="…" />` (the mockup's hand-drawn icons looked rough; client is told as FYI)
- **Dropdowns and popups:** [Radix UI](https://www.radix-ui.com) primitives styled with our tokens (native `<select>` lists can't be styled)
