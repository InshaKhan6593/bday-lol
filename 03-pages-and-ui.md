# 03: Pages and UI (taken from the mockup source)

Source files: `resources/mockup-source/*.dc.html`. **Open the file for exact pixel values.** This doc gives the
structure, copy and behavior. Mockup boards (from `canvas.json`): desktop width **1440**, mobile width **390**.

Template syntax in the files: `{{x}}` = a value computed in the `<script>` at the bottom of each file,
`<sc-if value>` = conditional, `<sc-for list as>` = loop. Names, photos, prices and the countdown in the mockup
are **demo data**.

| Board | File |
|---|---|
| Homepage desktop / mobile | `Main.dc.html` / `MainMobile.dc.html` |
| Homepage "nobody yet" desktop / mobile | `MainEmpty.dc.html` / `MainMobileEmpty.dc.html` (these just render Main with `nobodyYet=true`) |
| Find your birthday desktop / mobile | `Day.dc.html` / `DayMobile.dc.html` |
| How it works desktop / mobile | `How.dc.html` / `HowMobile.dc.html` |
| Claim desktop / mobile | `ClaimDesktop.dc.html` / `Claim.dc.html` |
| Claimed / share desktop / mobile | `SuccessDesktop.dc.html` / `Success.dc.html` |
| Social ads (12 months) + daily post | `Social*.dc.html` (marketing images, see 07-open-questions.md) |

---

## Global: header
**Desktop** (padding `24px clamp(16px,4vw,56px)`): logo **"bday.lol"** (28px/800) on the left. On the right a nav with
"Find your birthday", "How it works" (17px/600 text links) and a black pill **"Claim your birthday"** (17px/800, padding 12px 22px).
Each page leaves out the link to itself (Find page: How it works + Claim. How page: Find + Claim. Claim and Success: Find + How, with no Claim pill).

**Mobile** (padding 16px): logo 24px. On the right a black pill **"Claim yours"** (44px tall) + a **hamburger menu** button (44×44, 3px border, radius 12).
The Find page's mobile header also has the hamburger (`DayMobile.dc.html`); its menu holds "How it works". Claim and Success on mobile use a simple centered/left "bday.lol" header.
Success mobile has a round **back** button. Menu contents aren't designed (see open questions).

The logo always links to the top of the homepage.

---

## 1. Homepage (`Main.dc.html`)
Background = `t.ground` of the #1's theme (or Butter if nobody yet). Main max-width **1180px**, gap 40px.

1. **Kicker + date** (centered)
   - Kicker 16px/800, uppercase, letter-spacing .18em: **"Today's birthday belongs to"**, or for an empty day **"Today's birthday is up for grabs"**.
   - H1 date "October 7": `clamp(52px, 11vw, 160px)`, 800, line-height .95, letter-spacing -.045em.
2. **#1 card** (white, 3px border, radius 28, shadow `10px 10px 0 #141414`)
   - Avatar circle 120px (photo; the mockup shows initials on the accent color), name `clamp(32px,4vw,52px)`/800, bio 19px #333 (shown in quotes in the mockup).
   - **▲ Boost** button: white pill, 48px tall, 3px border, top right of the card. On mobile it sits above the name with `margin-left:auto`. Hover = black background, white text.
   - **"Send a birthday gift"** panel (ground-color background, 3px border, radius 22): a grid of black gift buttons (56px tall, 19px/800, white ↗ arrow icon) + "Gifts go straight to them. bday.lol never touches the money."
   - **"SHARE THIS BIRTHDAY"** panel: the share URL on the right, then a 2×2 grid: **Share**, **Facebook**, **Text**, **Copy link** (white, 3px border, 48px tall).
3. **Nobody-yet card** (replaces the #1 card when today has no bids)
   - Dashed 120px circle with "?", **"Nobody yet."**, "Today is wide open. The highest bid gets the homepage."
   - Box: **"Know someone born today?"** / "Send them the link so they can claim it first." + **"Text them the link"** (black) and **"Copy link"** (white) buttons.
   - **Hidden** in this state: gift buttons, share buttons, Boost button, and the "others celebrating" bar.
4. **Black claim bar** (#141414, radius 24)
   - Kicker (accent color, 14px uppercase): **"Is today your birthday too?"**, or when empty **"Is today your birthday?"**
   - "Own today for **$X**", where X = top total + $1 (or **$5** if empty). Price 30px/800 white.
   - **"DAY ENDS IN"** + countdown `HH:MM:SS` (30px/800, tabular numbers), counting down to midnight ET.
   - CTA button with accent background: **"Claim the top spot"**, or when empty **"Claim today first"**. Links to Claim.
5. **Others bar** (only when claimed): up to 4 overlapping 44px avatar circles + **"7 other people are celebrating October 7"** + "See everyone →". The whole bar links to today's date page.
6. **Coming up**: H2 "Coming up" (32px) + a "Find your birthday" link. A grid of 4 cards (`auto-fit minmax(200px,1fr)`): date ("Oct 8", 26px/800), owner as **first name + last initial** ("Marcus T.") or **"Unclaimed"**, and price ("Claimed for $85" / "Claim for $5"). Each links to that date's page.
7. **3 steps** (big numbers 44px):
   1. **Bid on your birthday**: "Let everyone know it's your day, and make it easy for them to celebrate you."
   2. **Highest bid owns the homepage**: "Until someone claims it with a higher bid. Yes, even on the day itself."
   3. **Get birthday gifts**: "Friends and fans send gifts to your Venmo, Cash App, Amazon, or Throne."
8. **Reminder signup** (white card, shadow 8px): **"Not your birthday today?"** / "We'll email you a week before yours, so you can claim it first." Fields: **Month** select ("Select"), **Day** select ("–"), **Email** ("you@email.com"), and a black **"Remind me"** button. Footnote: "One email a year, a week before your birthday. Unsubscribe anytime."
9. **Boost box**: modal-ish dialog (see Boost box below), opened from the ▲ Boost button.

---

## 2. Find your birthday / date page (`Day.dc.html`)
Background = ground color of the viewed date's #1 (**Cloud** if no bids), fading over 0.3s. Main max-width **980px**.

1. **Date nav row**: ◀ (48×48), **"📅 Pick a date"** button, ▶, and **"Back to today"** (underlined text) when not viewing today.
2. **Calendar popover** (opens under the row, max-width 440, white, shadow 8px)
   - Month header with ◀ ▶ month arrows. **No year anywhere**. February always has **29** days.
   - A 7-column grid of day buttons (52px tall, 2px border, radius 10): the day number (17px/800) and below it the **current top total** ("$240") or **"open"** (11px). Note: the cells start at day 1 with no weekday offset, because month+day has no weekday.
   - Colors: **selected = black/white text**. **Today = today's #1 ground color** (whatever date is being viewed). **All other dates white.**
   - Footnote: "Under each date: the current top bid."
   - Picking a date closes the calendar and resets search, pick and gift-menu state.
3. **Heading**: H1 **"Everyone celebrating October 7"** (`clamp(40px,6vw,72px)`, mobile 36px). Status line (19px/600):
   - Today: **"Today · day ends in 11:40:52"**
   - Future (this year): **"In 3 days · bidding is open"** ("1 day" when singular)
   - Passed: **"Next one: Oct 1, 2027 · bidding is open"** (next occurrence, leap-year aware)
   - When not today, an extra line: "Gifts can be sent on the birthday itself. Until then, share it so friends know it's coming."
4. **Black CTA bar**
   - Default: **"Own the top spot"** / "Bid $X or more." (X = top + 1, or $5) and an accent button **"Bid on October 7"**.
   - After clicking a card (picked rank N > 1): **"Claim today's #2 for $226"** (or "Claim October 12's #2 for …") / "Bid $226 or more to take #2." + underlined **"Or go for #1"** link + button **"Claim #2 for $226"**.
   - The button goes to Claim with date, rank and price pre-filled.
5. **Empty state** (no entries): dashed box: "Nobody has claimed October 7 yet. The highest bid gets the homepage."
6. **Search** (only if people exist): 56px input with a 🔍 icon, placeholder **"Search names on October 7"**, and a clear ✕ button. It filters by name as you type, searches **only the viewed date**, and **clears when the date changes**. It shows **"3 of 8 people"** while a query has matches.
   - No match: dashed box **"No "[query]" on October 7 yet"** / "Know it's their birthday? Send them the link so they can join." + **"Text them the link"**, **"Copy link"**, and the link **"Or claim it for them"**.
7. **Ranked list** (highest total first). Each card is white with a 3px border and radius 22. Only #1 has a shadow `8px 8px 0`.
   - Desktop row: "#1" (24px/800, 40px wide) · 60px avatar · name (22px/800) + badge (#1 only: **"ON THE HOMEPAGE"** if today, **"TOP BID"** otherwise, on the accent pill) · bio (17px) · optional **held line** · **▲ $240 boost pill** · gift control · share icon button (48×48).
   - **Held line** (mockup, today only): "On the homepage since 2:40 PM" / "Held the homepage 9:12 AM – 2:40 PM". This needs a log of #1 changes (see open questions).
   - Mobile row: stacked layout. A 52px avatar with a black rank bubble at the top-left, name (ellipsis), bio (clamped to 2 lines), badge, held line, then a row with a full-width "Send a gift" or "Gifts open" button + a 44px share button.
   - **Hover card** → a tooltip above the card in the **accent color**: **"Claim this rank for $X"** (their total + $1). Clicking (or tapping on mobile) the card → smooth-scroll to the top and switch the CTA bar to "Claim #N" mode.
   - **Boost pill hover** → tooltip **"Boost Jess"**, and the card tooltip hides. The pill hover style is a black background with white text. Clicking it opens the Boost box and **does not** trigger claim-this-rank.
   - **"Send a gift ▾"** (today only): a black button with a chevron. Desktop: **hover or click** opens a menu below it, aligned right (min-width 250, white, shadow 6px). Each option is an accent-colored row with black text, a 3px black border and a ↗ icon, and opens that link. The menu shows even when there's only one option. Mobile: tap toggles it. Using the gift control **never** triggers Claim this rank.
   - Other dates: a dashed pill **"Gifts open Oct 7"**. For dates that have passed this year it includes the year: **"Gifts open Oct 1, 2027"**.
8. **"About October 7 birthdays"** section (SEO, see 06-seo.md for the data)
   - H2 (32px, mobile 26px). Grid of 3 columns (mobile 2).
   - Full-width rank card: **"#287"** (44px) + "The 287th most common birthday in the US, out of 366" + "About 11,200 US babies are born on October 7 each year."
   - 3 fact cards: **ZODIAC SIGN** / Libra / "Star sign for October 7"; **BIRTHSTONE** / Opal / "October birthstone"; **BIRTH FLOWER** / Marigold / "October birth flower".
   - **"Famous people born on October 7"**: up to 10 rows, each with **name** (17px/800) + ", what they're known for" (15px) on the left and **"Age 67"** on the right. Rows are separated by 2px #EFEFEF lines.
   - Bottom link row: **"← October 6"**, **"All October birthdays"** (month page), **"October 8 →"**.
9. **Boost box** (see below).

---

## 3. Claim a birthday (`ClaimDesktop.dc.html` / `Claim.dc.html`)
Background = the selected theme's ground (starts on **Butter** per the doc). Desktop is two columns: the form card (flex 3) and a sticky aside (flex 2). Mobile is one column.

- H1 **"Claim a birthday"** + "Takes about a minute. Your page goes live the moment you pay." (desktop)
- **DATE AND BID**
  - **Month** select + **Day** select (366 combos, no year). Desktop is 2 equal columns; mobile is 3fr/2fr.
  - Black leader box: kicker (accent) **"CURRENT LEADER"**, or **"CURRENT #2"** when claiming a rank, + the leader's name (or "Nobody yet") + their total (or "$0").
  - **Your bid** + hint: "$241 or more to claim the homepage" / "$226 or more to take #2" (on mobile prefixed with "Bid "). A big 28–30px input, pre-filled with the minimum.
- **ABOUT THE BIRTHDAY PERSON**: a dashed 64px **"Add photo"** circle (+ icon), **Name** (maxlength **40**), helper "Surprising someone on their birthday? Use their name and photo.", **One-line bio** textarea (maxlength **80**, with a "54 / 80" counter).
- **WHERE SHOULD GIFTS GO?** / "Paste a link and we'll turn it into a gift button on your page."
  - A link input (placeholder "Paste a Venmo, Cash App, Amazon, or Throne link"). Rows after the first have a ✕ remove button. **"+ Add another"** shows while there are fewer than 3 links.
  - Live hint under each input: valid → **"Your page will show a "Send on Venmo" button"** (bold, black). Invalid → **"We can only use Venmo, Cash App, Amazon, or Throne links"** (red **#B3132B**).
  - Accepted-formats footnote (see 02 §5).
- **YOUR COLOR** + the selected theme's name on the right. 12 round swatches (desktop 12 columns, mobile 6). Selected = ring `0 0 0 3px #FFF, 0 0 0 6px #141414`. Picking one recolors the page.
- **Email** + "For your receipt and outbid alerts. Never shown."
- **Aside (desktop)**: **PREVIEW** card (the ground-colored header "TODAY'S BIRTHDAY BELONGS TO" + date, then avatar + name + bio) and a **Total** card (36px amount) + a black **"Pay & claim"** button + "Bids are final. If someone outbids you, you stay on this day's birthday list and can still get gifts."
- Mobile: no preview card. Total + "Pay & claim" at the bottom.
- "Pay & claim" → **Stripe Checkout** → Success page.
- Prefill from "Claim this rank": the mockup passes `{date, rank, name, theirBid, min}` (through localStorage, valid for 10 min). In production use URL params or server state instead. The page is **noindex**.

---

## 4. Claimed / share (`SuccessDesktop.dc.html` / `Success.dc.html`)
Background = the chosen theme (demo: Sky #BFD8FF). Desktop has two columns.
- Kicker **"YOU'RE ON THE HOMEPAGE"**, H1 **"October 7 is yours.<br>For now."**, "Share it so everyone knows it's your day."
- 2×2 buttons: **Share**, **Facebook** (both black), **Text**, **Copy link** (both white with a border).
- Note box: "If someone outbids you, we'll email you right away so you can bid back. Either way, you stay on October 7's birthday list."
- Link **"See the homepage"**.
- **"HOW YOUR LINK LOOKS WHEN SHARED"**: an OG card preview at 1.91:1. Ground background, avatar circle (accent), "TODAY'S BIRTHDAY", date (54px), name. Footer: **"It's Sam's birthday on bday.lol"** + `bday.lol/oct-7`.
- Mobile order: header with a back button → heading → OG preview → share buttons → note → "See the homepage".
- The copy only fits claims of today's #1. Variants for other cases are needed (see open questions).

---

## 5. How it works (`How.dc.html`)
Always **Butter** (#FFEC94). Accent is #A88BFF. Main max-width 980.
- H1 **"One birthday.<br>The whole internet."** (`clamp(48px,8vw,104px)`, mobile 36px) + "Every day, bday.lol shows one person on its homepage. Whoever bids the most on that date gets the spot, until someone outbids them."
- 3 step cards (white, shadow 8px, numbered 52px circles in #A88BFF):
  1. **Place a bid on your birthday**: "Let everyone know it's your day, and make it easy for them to celebrate you. Bids start at $5."
  2. **Highest bid owns the homepage**: "Anyone can outbid you, even on the day. Everyone else stays on that date's list."
  3. **Get birthday gifts sent your way**: "Friends and family send gifts straight to your Venmo, Cash App, Amazon, or Throne wishlist."
- **Questions** (H2 36px): accordion `<details>` items (64px summary, 19px/800, a round + icon that rotates 45° when open). **Use this copy verbatim**:
  1. **What happens if someone outbids me?**: They get the homepage and you move down to that date's birthday list, where people can still find you and send gifts. We email you right away so you can bid back.
  2. **Are bids refundable?**: No. A bid buys you a spot on that date's list, and the homepage while you are the top bid. Getting outbid is part of the game.
  3. **When does a day start and end?**: Midnight to midnight, Eastern Time. The countdown on the homepage always shows how long is left.
  4. **How do gifts work?**: When you claim a date, you add a link to your Venmo, Cash App, Amazon, or Throne wishlist. On your birthday, anyone can tap a button on your page to send you money or buy something off your wishlist. bday.lol never touches it.
  5. **Can I claim a birthday for someone else?**: Yes. Use their name and photo. Add their Venmo, Cash App, Amazon, or Throne wishlist so gifts go straight to them.
  6. **Do I have to prove it is my birthday?**: No. You are claiming the date, not proving it.
  7. **What is the minimum bid?**: $5 for an open date. To pass anyone on the list, bid at least $1 more than they did.
  8. **Can I raise my bid, or help a friend?**: Yes. Tap the ▲ next to anyone's total to boost it, including your own. Boosts start at $2, add to that person's total, and are final. Boosts are paid to bday.lol, not to the birthday person.
  9. **Can I use bday.lol outside the US?**: Yes. bday.lol works worldwide, and you pay in your local currency at checkout. For gifts outside the US, Throne works best, since Venmo and Cash App are mostly US-only.
  10. **Is my email shown anywhere?**: Never. We only use it for receipts and outbid alerts.
- Black bottom bar: **"When's your birthday?"** + a #A88BFF button **"Find your date"** → Find page.

---

## Boost box (shared by Homepage and Find pages)
- A dim overlay (`rgba(20,20,20,.55)`, click to close) + a dialog (max-width **440**, white, 3px border, radius 24, shadow `10px 10px 0`, padding 20, gap 12).
- **Positioned next to the clicked button**: the mockup sets `top = buttonTop + scrollY - 300`, clamped so the whole box (about 560px) stays inside the viewport. It's horizontally centered.
- Contents in order:
  1. Title **"Boost Jess Moreno"** (24px/800) + **"Currently #1 on October 7 with $240."** + a ✕ close button (40×40).
  2. 4 chips **$2 $5 $10 $20** (52px tall, 3px border, radius 14). Selected chip = black with white text. The default is $5.
  3. Only when the person is below #1: a full-width accent chip **"Take #1: +$16"**. It fills "Other amount".
  4. **"Other amount"** input (overrides the chips when > 0).
  5. Result line in a ground-colored box (17px/800): see 05-business-logic.md.
  6. Checkbox (checked by default) **"Email me if Jess gets passed"**.
  7. Black **"Boost $5"** button (56px).
  8. Fine print 13px (see 02 §4).
- Pay → Stripe Checkout (production). The mockup just adds the amount.

---

## Interaction notes worth copying from the mockup
- The page background color transition is `background-color 0.3s ease`.
- Tooltips fade and slide 4px (`.15s`), with an arrow made from `::before`/`::after` borders.
- The gift-menu chevron rotates 180° on hover.
- The Find page's accent badge and CTA button also transition background over 0.3s.
