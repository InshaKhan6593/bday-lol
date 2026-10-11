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
pnpm famous:refresh 10          # optional: famous October birthdays from Wikidata (all months: no argument, ~1 h)
pnpm dev                        # http://localhost:3000
```

### Cloud session

Claude Code cloud containers now ship Docker, but the daemon isn't running and Docker Hub often answers `429 Too
Many Requests`. Start the daemon and pull through Google's Docker Hub mirror, then run the normal steps:

```bash
(sudo dockerd > /tmp/dockerd.log 2>&1 &) && sleep 5
for i in library/postgres:17-alpine axllent/mailpit:latest; do
  docker pull mirror.gcr.io/$i && docker tag mirror.gcr.io/$i ${i#library/}
done
cp .env.example .env.local && pnpm install
docker compose up -d --pull never && pnpm db:migrate && pnpm db:seed && pnpm dev
```

#### Without Docker

Older containers have Postgres 16 installed but no Docker. Run it natively on the same port, so the
`.env.example` URL works unchanged, and use the Mailpit binary for email:

```bash
sudo sed -i 's/^port = 5432/port = 5440/' /etc/postgresql/16/main/postgresql.conf && sudo pg_ctlcluster 16 main start
sudo -u postgres psql -p 5440 -c "CREATE ROLE bday LOGIN SUPERUSER PASSWORD 'bday';" -c "CREATE DATABASE bday OWNER bday;"
cp .env.example .env.local && pnpm install && pnpm db:migrate && pnpm db:seed
# Mailpit: download mailpit-linux-amd64.tar.gz from github.com/axllent/mailpit/releases, then
./mailpit --listen 127.0.0.1:8030 --smtp 127.0.0.1:1030 &
pnpm dev
```

### Payments (Stripe test mode)

Put your Stripe **test** keys in `.env.local` (`STRIPE_SECRET_KEY=sk_test_…`). Then, in a second terminal,
forward Stripe's webhooks to the app (the CLI prints the `whsec_…` value for `STRIPE_WEBHOOK_SECRET`):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Pay with Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC. A claim stays hidden
(`pending`) until the webhook marks it paid; the Success page shows "Finishing up…" until then. Boosts
return to the page they started on with `?boosted=…` and a short "Your boost is in" note.

| URL | What |
|---|---|
| http://localhost:3000 | The app |
| http://localhost:3000/styleguide | The design language, then two suggested changes for the client with before/after screenshots (icons, gift link help). Also live in production, noindex |
| http://localhost:8030 | Mailpit: every email the app sends lands here |
| http://localhost:3000/dev/emails | All 8 emails with demo data (dev only) |
| `pnpm db:studio` | Browse the database |

## Scripts

| Script | Does |
|---|---|
| `pnpm test` | Unit tests + database tests (`*.db.test.ts`, need `pnpm db:up`; they roll back, so seed data is untouched) |
| `pnpm typecheck` / `pnpm lint` | Static checks |
| `pnpm db:generate` | New migration from `src/db/schema.ts` changes |
| `pnpm db:init` | Create the rows a new database needs (the birthday board type). Safe to rerun and on a live database; run it once after `pnpm db:migrate` on production, where the seed is never run |
| `pnpm db:reset` | Wipe the local DB, migrate, seed (refuses non-local databases) |
| `pnpm emails:tick` | Send every scheduled email that is due now (what the production cron does). Respects `DEV_NOW` |
| `pnpm famous:refresh [month]` | Fill "Famous people born on…" from Wikidata + Wikipedia pageviews: all 12 months (about an hour) or one (`pnpm famous:refresh 10`). What `/api/cron/famous` does on days 1–12 of each month |
| `pnpm data:commonness` | Rebuild `src/lib/commonness-data.ts` from FiveThirtyEight's births data (only if the source changes) |

## Fake clock

Set `DEV_NOW` (ISO 8601) to make the app think it's that moment. Ignored in production.

```bash
DEV_NOW=2026-10-07T23:58:00-04:00 pnpm db:reset   # 2 minutes before Oct 7 ends (ET)
DEV_NOW=2028-02-27T12:00:00-05:00 pnpm db:reset   # Feb 29, 2028 is "coming up"
DEV_NOW=2026-10-07T08:05:00-04:00 pnpm emails:tick # Oct 7's "Your day is here" emails
```

## Emails

Receipts and the admin alert go out from the Stripe webhook; outbid alerts too, the moment someone loses #1.
Everything on a timer (hourly boost digest, "Your day is here" at 8 AM ET, reminders a week before) runs from
`/api/cron/emails` on Vercel (`vercel.json`). It is built to run every minute, which needs Vercel Pro; while the
project is on the free plan it runs once a day (after 13:05 UTC, past 8 AM ET all year), so the digest and
throttled outbid alerts wait for that run. Locally there's no cron: run `pnpm emails:tick`.
Each email is sent once (dedupe keys in `email_log`). Details in [../08-emails.md](../08-emails.md#how-theyre-sent-step-8).

## Where things live

```
src/
  app/                 routes (pages, API: api/stripe/webhook, api/cron/emails, api/unsubscribe)
  components/ui/       design-language primitives: Button, Chip, Surface, Avatar, Badge, Kicker, Field, Select, Menu, Icon…
  components/site/     shared by every page: header, menu, countdown
  components/home/     homepage sections
  components/date/     date page ("Find your birthday"): date picker, ranked list, gift menu, About
  components/how/      How it works page styles
  components/claim/    Claim form: photo picker, gift links, color swatches
  components/success/  Success page styles + "Finishing up…" poller
  components/month/    month pages (/october): the hub that links every date
  components/boost/    the Boost box (homepage + date page)
  components/share/    share and copy-link buttons, shared-link card
  config/              themes (12), board type settings (min bid, min boost, time zone…)
  db/                  schema.ts (board → entries → payments model), client
  lib/                 pure rules: birthday.ts (ET, leap years, board years), date-page, claim, checkout, success, facts, money, boost math, gifts, routes, clock, ids
  test/                database test helpers (rolled-back transactions)
  server/              server logic: leaderboard queries, page data, payments (claims + boosts, pending → paid), outbid alert queue, Stripe client + events, photo storage, reminders; actions/ = form actions
  server/email/        sending: mailer (Mailpit / Resend SMTP), sendEmail (dedupe + unsubscribe), payment emails, scheduled emails, suppressions
  server/famous*.ts    famous people: Wikidata provider (famous-source.ts), monthly refresh and reads (famous.ts)
  server/og-card.tsx   share images (Open Graph) drawn with next/og; fonts in src/assets/fonts
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
- every `components/ui/*.module.css` wraps its rules in `@layer primitives { … }` (order set in `globals.css`). Page modules stay unlayered, so a `className` passed to a primitive always wins, whatever order the CSS loads in

Decided (2026-10-09): keep the **client's look** exactly: rounded pastel shapes and Bricolage Grotesque.
We compared it with neubrutalism.com's square style and its fonts (Syne is too wide for the giant homepage date).
Two upgrades over the mockup:
- **Icons:** [Phosphor](https://phosphoricons.com), Bold weight, via `<Icon name="…" />` (the mockup's hand-drawn icons looked rough; client is told as FYI)
- **Dropdowns and popups:** [Radix UI](https://www.radix-ui.com) primitives styled with our tokens (native `<select>` lists can't be styled)

## Load and concurrency tests

| Command | What it does |
|---|---|
| `pnpm test` | The unit and database tests, then `pnpm test:concurrency` |
| `pnpm test:concurrency` | Fires many payments at one board at the same moment on real connections (60 boosts, the same webhook 5 times over, 30 same-name claims) and checks totals, ranks, personal links and the #1 log. Runs on its own because the other database tests lock every table |
| `pnpm load:test [url]` | No-install load test: holds 10 → 400 visitors on each kind of page and prints requests per second, latency and open database connections. Run it against `pnpm build && pnpm start -p 3100`, never `pnpm dev` |
| `k6 run -e BASE_URL=… scripts/k6-load.js` | The same visitor mix for a staging copy or Vercel preview, with `PROFILE=stress` (default), `spike` or `soak`. Needs [k6](https://k6.io). Never point it at production |

Both load tests only send GET requests: they never start a checkout, so Stripe is not touched.

**Local results, 2026-10-11** (one `next start` process, pool of 10 connections, this laptop also running the test).
"Before" is with every read done per request; "after" is with the board read in one query and the slow-changing
reads cached (`src/server/cached.ts`: settings 5 minutes, a date's famous people 1 hour, the date picker's top bids
30 seconds or until the next payment).

| Page kind | Queries per view | Requests per second | Median wait at 10 / 100 / 400 visitors | Errors |
|---|---|---|---|---|
| Cached (How it works, Terms, month pages) | 0 | about 1,000–1,150 | 9 ms / 86 ms / 0.36 s | 0 |
| Homepage, before | 7 | about 100–160 | 94 ms / 0.82 s / 3.0 s | 0 |
| Homepage, after | about 2 | about 150–205 | 61 ms / 0.62 s / 2.3 s | 0 |
| Date pages, before | 8 | about 110–155 | 86 ms / 0.82 s / 3.2 s | 0 |
| Date pages, after | about 2 | about 125–185 | 69 ms / 0.67 s / 2.5 s | 0 |

Nothing failed in either run. What limits one process now is rendering the page (CPU), not the database, and Vercel
adds processes under load: there the database's connection limit is the ceiling, which is why the query count matters
more than these laptop timings. Set `DATABASE_POOL_MAX=3` on Vercel. These are not Vercel's numbers: run the k6 script
on a preview before launch.
