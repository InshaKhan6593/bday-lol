# 07: Open questions, gaps and conflicts

These were found by comparing the Google Doc, the chat and the mockup source.
**Status (2026-10-09):** every question we could answer from the doc, chat or mockup is now **decided** (sections A and B).
Only the items in **section C** really need the client. Send them in **one message** (draft in `private/README.md`, local only).
The client can still override any decision in A or B. They are listed in the message as "FYI, tell me if you want it different".

## A. Conflicts between sources (all decided)
| # | Issue | Decision | Why |
|---|---|---|---|
| A1 | Mockup share URL is `bday.lol/oct-7`, SEO spec says `/october-7` | `/october-7` is the real URL. `/oct-7` 301-redirects to it | The client wrote `/october-7` himself in his latest message (latest chat wins) |
| A2 | Claim page starts on **Sky** in the mockup, the doc says **Butter** | Butter | The doc states it explicitly. The mockup is just demo state |
| A3 | Mobile Success says "**November 30** is yours", while the preview says October 7 | Mockup typo. Show the claimed date | Same screen on desktop says October 7 |
| A4 | Sample famous list includes a politician | Entertainment only | The client listed the fields explicitly in the chat |
| A5 | Home step copy differs from How-it-works step copy | Keep each page's own copy | Doc: "Use the wording from the mockup" |

## B. Behavior not specified (all decided)
| # | Question | Decision |
|---|---|---|
| B1 | Success page copy for a **future date** or **rank #2+** | The page reads the **real result from the DB** (not what the user hoped for). While the webhook is still arriving, it shows "Finishing up…" and polls every ~1.5 s. Variants (same layout, only the top text changes): **Today + #1** = mockup copy. **Future + #1**: "You're #1 for October 12" / "October 12 is yours. For now." **Rank #2+**: "You're on the list" / "You're #3 on October 7." Shown to the client as FYI |
| B2 | Tie-break on equal totals | Whoever reached that total **first** stays ahead. Store `total_reached_at` on each entry, update it on every boost, and sort by `total DESC, total_reached_at ASC`. All amounts are **whole dollars** (the mockup never shows cents), so ties are clean. **Example:** Sara reaches $100 at 2:00 PM and Ana reaches $100 at 3:00 PM, so Sara stays #1 and Ana's Boost box says "Stays at #2". "Take #1" shows **+$2**, not +$1, because the minimum boost is $2. Ana's friend pays $2, Ana has $102 and takes #1, and Sara now needs $103. Matching a total never wins, you always have to beat it |
| B3 | Can a claimer edit their entry later (no accounts)? | v1: **admin can edit any entry** (the admin edit form is already needed for comped entries). Users email the client to fix a typo. Self-service edit links are an extra if he wants them. **Also in section C** |
| B4 | Same email claims the same date twice | Allowed, with no block. Real case: a parent claims October 7 for **twins** using one email. Raising your own rank is done with boosts |
| B5 | Payment that crosses midnight ET | The board is fixed when the Checkout Session is **created** (board id in the session metadata). The session expires after 30 min (Stripe's minimum). A late payment still counts on the board the payer chose. No outbid alerts for a closed board. **Plus:** in the last 30 min of today, the Claim page and Boost box show "Today ends in 12 min. Finish paying before midnight ET." so it rarely happens |
| B6 | Minimum no longer met at webhook time (someone else paid first) | Accept it (bids are final). Rank by the actual total. Apply every payment inside a **DB transaction that locks the board**, so rank, the #1 log and outbid alerts never get mixed up when two payments land at once. Confirmation email and success page show the real rank, plus how much it takes to reach #1 |
| B7 | Photo rules | Optional, with the initials fallback. **Cropped to a square and resized to 512px in the browser** before upload (fast on mobile, and it **removes GPS/EXIF data** from phone photos). Uploaded before checkout as "pending". Unpaid uploads are deleted after 24 h. The admin alert email includes the photo |
| B8 | Claim email: form or Stripe? | The **form** email wins. It's passed to Stripe as `customer_email` so they match |
| B9 | "Held the homepage 9:12 AM – 2:40 PM" lines | Build them on today's board only, from the #1-change log (outbid alerts need that log anyway). The mockup shows them, and the client wants pixel-for-pixel |
| B10 | "Coming up": how many, and the name format | The **next 4 days**, "Marcus T." or "Unclaimed", "Claimed for $85" / "Claim for $5". All of this comes straight from the mockup |
| B11 | "X other people are celebrating" | Entries on today's board minus #1. Up to 4 avatars |
| B12 | Mobile hamburger menu contents | A dropdown in the same style with "Find your birthday" and "How it works" ("Claim yours" is already in the header) |
| B13 | Month pages (`/october`) aren't designed | Same style. For SEO they need **real, unique text**, not just a grid: H1 "October birthdays", a short intro, the calendar grid (top total per date), a list of all dates (each with its #1, commonness rank and zodiac), the month's most common and rarest birthday, birthstone, flower, and prev/next month links. Everything comes from data we already have. The client sees it in review |
| B14 | Admin auth and URL | `/admin` with one password (stored hashed in env), httpOnly session cookie, **login rate limit**, noindex, blocked in robots.txt. Simpler than accounts. Marcus is the only admin |
| B15 | Revenue reports | Simple admin table: paid claims + boosts by day and month, comped shown separately and excluded. Stripe stays the real source |
| B16 | "Your day is here" send time | 8:00 AM ET |
| B17 | Do boosters' alert lists carry across years? | No. Alert lists belong to an entry, and entries belong to one board year |
| B20 | User report/flag button | No. Not requested. Moderation happens through admin alert emails |
| B21 | Feb 29 on the calendar every year | Yes. The client said the picker shows all 366 dates. The board year is the next leap year ("Next one: Feb 29, 2028") |
| B24 | Mockup icons are hand-drawn and look rough | Use **Phosphor icons, Bold weight** (phosphoricons.com) for the whole site. Same icon in each place, cleaner drawing. Told to the client as FYI, since it differs slightly from the mockup |
| B22 | Data credits | Small "Source: FiveThirtyEight (CDC/NCHS, SSA)" line under the commonness card (the data is CC BY, so attribution is required). Wikidata is CC0, no credit needed |
| B23 | Claim page: bid typed **below the minimum** (mockup doesn't cover it) | Show an error in the gift-link red (#B3132B) under the bid box: "Bid at least $241 to take the homepage." (or "…to take #2."). "Pay & claim" is disabled until it's fixed. The server checks the amount again before creating the Checkout Session |

## C. Needs the client (cannot be decided by us)
| # | Item | Why it's his call | What we do meanwhile |
|---|---|---|---|
| C1 | **Accounts, domain and monthly costs**: does he own `bday.lol`? He needs to create or provide: Stripe (Adaptive Pricing on), Resend (+ DNS records to verify the domain), hosting (Vercel **Pro**, since the free plan doesn't allow commercial sites), a database, image storage, Google Search Console. Also the **admin alert email address** | His business, his money, his ownership. Free tiers are small, and Resend's free plan has a daily send cap that the "your day is here" emails can exceed | Build on our own test accounts, then move to his before launch |
| C2 | **Legal pages and contact info**: Terms (incl. the no-refund rule), Privacy Policy, a support email, and a postal address for the email footers | Stripe reviews these before it activates live payments. Marketing-style emails (reminders) need an address and unsubscribe link. We can't write legal text for him. The mockup has **no footer**, so adding one is a design change | Add a small footer (Terms · Privacy · Contact) in the same style. Placeholder text until he sends his |
| C3 | **Social ad boards** (12 monthly ads + "Daily birthday post") are in the mockup but not in the doc or chat | Scope and price. Auto-generating a daily post image would be an extra | Treat them as **out of scope** (marketing images for him to use) unless he says otherwise |
| C4 | **Editing after paying** (see B3) | A product decision with a scope cost | Admin-only editing in v1 |
| C5 | **Live rank preview on the Claim page**: as the user types a bid, the hint changes from the fixed "$241 or more to claim the homepage" to e.g. "$150 puts you at **#4** on October 7". The Boost box already does this. The Claim page in the mockup doesn't | Small change, but it changes mockup copy, and he wants pixel-for-pixel | Build it as in the mockup (fixed hint). Add the live line only if he says yes |

---

## D. Handoff v2: points to confirm with the client

The updated handoff (2026-10-10) says to ask the client whenever the notes and the mockup disagree. Until he answers, each
item below **keeps what was already built**.

| # | Where | Notes say | Mockup shows | Kept for now |
|---|---|---|---|---|
| D1 | Homepage gifts | One "Send a birthday gift ▾" button that opens the options | The gift panel with full-width buttons ("Send on Venmo") | The panel (mockup) |
| D2 | Homepage, nobody claimed today | The page uses gray (Cloud) | Butter (yellow) | Butter |
| D3 | Calendar | Unclaimed dates are gray | Unclaimed cells are white | White |
| D4 | Kids on the board | A child's card has a first name only and no gift button | Sample data has a `minor` flag, but the Claim form has no way to say "this is my child" | No flag yet: a listing with no gift links simply has no gift button. Admin can hide listings (step 10). **Planned as step 8b (before SEO):** a "This is my child (under 18)" checkbox that sets the mockup's `minor` flag; tell the client as FYI |
| D5 | Database | — | Privacy Policy names **Supabase** (database and file storage) | **Decided 2026-10-10: Supabase** in production (Postgres + Storage for photos), so the policy text stays as written |
| D6 | Emails | Lists 4 kinds (receipt, outbid, alert to followers, reminder) | — | All 8 from the original doc |
| D7 | Postal address | Not given | — | `EMAIL_FOOTER_ADDRESS` stays empty (reminder emails should have one) |
| D8 | Success note for rank 2+ | "If someone passes you, we'll email you right away" | Same note for every rank | Outbid emails only go when someone loses #1, so rank 2+ gets "You stay on October 7's birthday board…" instead of a promise we don't keep |

Settled by the handoff: C2 (Terms, Privacy, support email mybdaylol@gmail.com, footer design), C3 (social boards out
of scope), most of C1 (domain mybday.lol on Cloudflare, Resend from hello@mybday.lol, Vercel, sole-proprietor Stripe).

## Message to the client

The ready-to-send message (section C questions + the FYI list of decisions) is kept in `private/README.md`, local only.
