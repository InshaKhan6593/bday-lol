# 05: Business logic and formulas

All money is in **USD** (Adaptive Pricing only changes what the payer sees). All "day" logic uses **America/New_York**
(handle DST through a tz library, not a fixed −5h offset).

## Dates, boards and yearly rollover
- A **birthday key** is month + day (`10-07`). 366 keys, including `02-29`.
- A **board instance** = (board type "birthday", key, **year**). Old instances are kept forever.
- **Current board year for a key**, computed from `nowET`:
  - Let `Y = nowET.year`. If the key's date in `Y` is **today or later** (and exists in `Y`), the current year is `Y`.
  - Otherwise use the next year in which that date exists. For `02-29`, that's the next leap year after the passed date.
  - Leap year: `(y % 4 == 0 && y % 100 != 0) || y % 400 == 0`.
- **Today's board** stays open until 23:59:59.999 ET of that date. At midnight ET it closes and the next year's instance becomes current (create lazily or with a cron, but the switch must be exact).
- New claims and boosts go to the **current** instance for that key **when the Checkout Session is created**. Store the board id in
  the session metadata and credit that board in the webhook. Sessions expire after 30 min. If payment lands after midnight
  (opened 11:59 PM, paid 12:01 AM), it still counts on the board the payer saw, and no outbid alerts go out for a closed board (decided, 07 B5).
- Status lines on the date page:
  - today → `Today · day ends in HH:MM:SS`
  - current year in the future → `In N day(s) · bidding is open` (N = calendar days in ET)
  - passed / next year → `Next one: Mon D, YYYY · bidding is open`
- "Gifts open" pill: `Gifts open Oct 7` when the next occurrence is this year, `Gifts open Oct 1, 2027` when it's a later year (Feb 29 → the next leap year).
- Homepage countdown = time until the next midnight ET.

## Entries, totals and ranking
- **Entry** = one person on one board instance: name, photo, bio, theme, ≤3 gift links, owner email, `total`, `comped` flag, `hidden/removed` flags.
- `total = initial claim amount + Σ boosts` (only paid or comped money counts).
- **Rank = sort by total, descending.** Ties: whoever reached that total **first** stays ahead (decided, 07 B2).
- **#1 of today's board = homepage owner.** Record every change of #1 with a timestamp. It's needed for the held lines ("On the homepage since 2:40 PM", "Held the homepage 9:12 AM – 2:40 PM") and for outbid alerts.

## Minimums
| Situation | Minimum |
|---|---|
| Claim on an empty board | **$5** |
| Claim to pass rank N (incl. #1) | **total(N) + $1** |
| Homepage "Own today for" | top total + $1, or $5 if empty |
| "Claim this rank" tooltip | that person's total + $1 |
| Claim page default bid | the minimum above, pre-filled |
| Boost | **$2** |
| "Take #1" chip | `max(2, total(#1) − total(this) + 1)` |

Validate minimums **on the server** before creating the Checkout Session, and again in the webhook (another payment may have
landed in between). If the amount no longer passes the intended rank, still accept the payment, because the money is
final and the entry is simply ranked by its actual total. The confirmation email shows the real rank (decided, 07 B6).

## Boost result line (exact copy from the mockup)
```
amt < 2                → "Boosts start at $2."
already #1             → "New total $X. Keeps {first} at #1."
newRank == 1           → "New total $X. Takes #1!"
newRank < currentRank  → "New total $X. Moves {first} up to #{newRank}."
else                   → "New total $X. Stays at #{rank}."
```
`newRank = 1 + count(other entries with total >= newTotal)`. The "Other amount" field (rounded) overrides the chip selection.
Currency format: `$` + `toLocaleString('en-US')` with no decimals ("$12,500").

## Gift link detection
```
contains "venmo.com"               → Venmo    → "Send on Venmo"
contains "cash.app"                → Cash App → "Send on Cash App"
contains "amazon.com" or "a.co/"   → Amazon   → "Shop my Amazon wishlist"
contains "throne.com"              → Throne   → "Gift me on Throne"
else                               → error "We can only use Venmo, Cash App, Amazon, or Throne links"
```
At most 3 links. On the homepage: 1 link → full label. 2–3 links → short names. Production should parse the URL host properly (not a substring match), store the normalized URL, and allow only `https`.

## Email rules
- **Outbid alert**: fires only when **#1 changes** on a board. Recipients = the previous #1's owner email + their alert list (boosters who ticked "Email me if X gets passed"). **Throttle: ≤1 per recipient per 15 min.** The email shows the **latest** amount needed (`max(2, newTop − theirTotal + 1)`), and its link opens the Boost box pre-filled.
- **"You got boosted"**: queue it per entry and send **one digest about every hour** to the entry owner.
- **Birthday reminder**: 7 days before the key's next occurrence, once a year. Claimers are auto-subscribed for next year (yearly re-claim).
- **"Your day is here"**: the morning of the date (ET), to every entry owner on that board, with their rank and share link.
- **Unsubscribe link** required on reminder, your-day and re-claim emails.
- **Admin alert**: a copy of every new claim goes to the client.

## Payments (Stripe Checkout)
- Two checkout types: **claim** (creates an entry) and **boost** (adds to an entry). Both are one-time payments in USD with Adaptive Pricing turned on.
- The entry or boost becomes real **only after the webhook** (`checkout.session.completed`). Make it idempotent.
- For boosts, the **email comes from Stripe** (customer_details.email). For claims, the **form email wins**. Pass it to Stripe as `customer_email` so the two match (decided, 07 B8).
- Store every payment and boost row (entry, amount, email, time, Stripe ids). **Comped** entries have no Stripe payment and are excluded from revenue.
- No refunds by policy, but the records must support manual refunds through Stripe.

## Facts tables (from the mockup, used for "About" and social posts)
- **Zodiac** (inclusive end dates): Capricorn ≤ Jan 19, Aquarius ≤ Feb 18, Pisces ≤ Mar 20, Aries ≤ Apr 19, Taurus ≤ May 20, Gemini ≤ Jun 20, Cancer ≤ Jul 22, Leo ≤ Aug 22, Virgo ≤ Sep 22, Libra ≤ Oct 22, Scorpio ≤ Nov 21, Sagittarius ≤ Dec 21, then Capricorn.
- **Birthstone** by month: Garnet, Amethyst, Aquamarine, Diamond, Emerald, Pearl, Ruby, Peridot, Sapphire, Opal, Topaz, Turquoise.
- **Birth flower** by month: Carnation, Violet, Daffodil, Daisy, Lily of the valley, Rose, Larkspur, Gladiolus, Aster, Marigold, Chrysanthemum, Narcissus.
- Ordinal helper: 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st…

## Generic model requirement (client build note)
Model it as `board_type` → `board` (instance: type + key + period/year + settings such as theme defaults and wording) → `entry` → `boost`/`payment`.
"Birthday" is one board type with 366 keys and a yearly period. A future "fundraising contest" type should not need schema changes.
