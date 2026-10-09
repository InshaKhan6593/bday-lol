# 02: Product spec (consolidated requirements)

This file merges the client's Google Doc, the chat clarifications and behavior seen in the mockup.
The verbatim doc is in `resources/client-spec-google-doc.txt`. Screen details are in 03-pages-and-ui.md, and exact formulas are in 05-business-logic.md.

---

## 1. Concept
- Same core mechanic as outbid.lol (**pay to take the top spot; anyone can outbid you**), built around **birthdays**.
- **366 dates** (Feb 29 included). Each date is its own leaderboard.
- The **homepage always shows today's date** and whoever is **#1** for it. A day runs **midnight to midnight, US Eastern Time**.
- Anyone can outbid #1 at any time, **even during the day itself**.
- **Everyone who bids stays on that date's list**, ranked by their **total**.
- **Bids are final** (no refunds).
- **Worldwide**: Stripe Checkout **Adaptive Pricing** lets people pay in their local currency. Everything is **settled and ranked in USD**.
- The site is **English only**. For international users, recommend **Throne** for gifts (this appears in the FAQ copy).
- The brand and domain in the mockup are **bday.lol**.

## 2. Bidding rules
- A new bid on an **open (empty) date starts at $5**.
- To pass anyone on the list (including #1) you need **at least $1 more than their total**. This applies everywhere: the "Claim this rank" popup, the bid box, the homepage's "Own today for" price and the Claim page.
- A claim creates a new **entry** on the date's current board with a starting total equal to the bid.

## 3. Yearly reset (client clarification + doc)
- Birthdays are **month + day only**, with no year. The date picker shows all 366 dates and has **no year selector**.
- Each date's board **resets yearly**. When the date's day ends (midnight ET), that board **closes** and a **new board for next year opens immediately**.
- Dates that have just passed therefore show as **open**, or with only a few new bids.
- Totals shown anywhere (including the calendar) always come from each date's **current** board, never from last year's.
- Bids and boosts **count only toward the board/year they were placed in**.
- **Feb 29** runs only in leap years. Its board stays open until the **next actual Feb 29**. Use a real leap-year check (2028 → 2032 → 2036…).
- **Never hardcode a year.** Always compute the next occurrence from the real current date (ET).
- **Never delete old boards.** A "Past winners" section may come later.
- Example from the client: someone visits on Oct 12, 2026 and claims Oct 1. They land on the **Oct 1, 2027** board, and it stays theirs unless they're outbid before that day ends.

## 4. Boosting
- Each entry has a **running total**, not a single bid. The claim starts the total, and every boost adds to it. **Rank = total**.
- **Anyone can boost anyone, including themselves, with no account.** This is how people raise their own bid and how friends and fans push someone up.
- Where you can boost from:
  - The **▲ [total] pill** on each person in Find your birthday. Hover tooltip: "Boost [first name]". Clicking elsewhere on the card still opens "Claim this rank".
  - The **▲ Boost** button on the homepage #1 card.
  - The **"Boost to take #1 back"** link in outbid emails. It opens the Boost box with the amount filled in.
- The **Boost box** opens next to the button that was clicked and must be fully visible without scrolling on desktop and mobile. It contains:
  - The person being boosted, with their current rank and total ("Currently #2 on October 7 with $225.")
  - Quick amounts: **$2, $5, $10, $20** (default selected: $5)
  - A **"Take #1: +$X"** button, shown only for people below #1
  - An **"Other amount"** field
  - A live result line: "New total $X. Takes #1!" / "Moves Ana up to #2." / "Keeps Jess at #1." / "Stays at #N." / "Boosts start at $2."
  - **"Email me if [first name] gets passed"** checkbox, **checked by default**
  - A **"Boost $X"** pay button
  - Fine print: "Boosts are final and add to [name]'s total. They're paid to bday.lol, not to [name]. Gifts still go straight to them."
- **Minimum boost is $2** (to cover Stripe fees). "Take #1" is never less than $2.
- Payment goes through **Stripe Checkout**. Use the **email Stripe collects**. If the alert box was checked, add that email to the boosted person's **alert list**.
- The list re-sorts after each payment. If the boosted person becomes #1 **for today**, the homepage switches to them (photo, name, bio, gift buttons, colors).
- Boosts count only toward the current year's board.
- **Store every boost as its own payment record** (person boosted, amount, email, time), not just the updated total. This is needed now for receipts, refunds and outbid alerts. "Boosted by X fans" and "Top fans" are later features, so don't build them yet.

## 5. Gift links (no gift money passes through us)
- When claiming, users paste **up to 3 links**: Venmo, Cash App, Amazon wishlist or Throne. **Detect the service from the URL** (mockup logic: `venmo.com` → Venmo, `cash.app` → Cash App, `amazon.com` or `a.co/` → Amazon, `throne.com` → Throne, anything else → error).
- Accepted-format help text: "Accepted: venmo.com/u/username, cash.app/$cashtag, your Amazon wishlist link (amazon.com/hz/wishlist/…), or throne.com/username."
- Labels: "Send on Venmo", "Send on Cash App", "Shop my Amazon wishlist", "Gift me on Throne".
- **Homepage #1 card**: with **1 link**, show the full label ("Send on Venmo"). With **2–3 links**, show short names ("Venmo", "Cash App", "Amazon", "Throne").
- **Find your birthday list**: shown inside a **"Send a gift ▾"** menu, **only on today's date**. On other dates the button is replaced with "Gifts open [date]".
- Copy: "Gifts go straight to them. bday.lol never touches the money."

## 6. Color themes
- **12 preset themes**, each a **background ("ground") color + accent color** (accent is used on buttons and badges). Use **one shared list** across the site. Hex values are in 04-design-system.md.
- Names: Blush, Apricot, Butter, Lime, Mint, Seafoam, Sky, Periwinkle, Lavender, Orchid, Bubblegum, Cloud.
- The user picks one when claiming.
- Which theme each page uses:
  - **Homepage**: the current #1's theme. It switches when someone takes #1. If nobody has bid today, use **Butter** (yellow).
  - **Find your birthday**: the #1's theme for the **date being viewed**. Dates with no bids use **Cloud** (gray), on this page only.
  - **How it works**: always **Butter**.
  - **Claim**: starts on Butter, and changes to the user's color when they tap a swatch. (The mockup's demo starts on Sky. The doc says Butter, so **follow the doc**.)
  - **Success page**: the color the user picked.
- **Fade**: whenever a page's color changes, transition over **0.3 s** instead of snapping.
- Cloud is also one of the 12 options anyone can pick.

## 7. Pages (see 03-pages-and-ui.md for full detail)
1. **Homepage**: today + #1 (photo, name, bio), gift buttons, share buttons, white **▲ Boost** button at the top right of the #1 card, a black **"Claim the top spot"** bar with "Own today for [price]" and a **countdown to midnight ET**, "X others are celebrating today", **Coming up** (next few dates), the 3 steps, and a **birthday reminder signup**. There is also a **"Nobody yet"** variant. Clicking the logo always loads the top of the homepage.
2. **Find your birthday** (the date page): date picker calendar with top totals, prev/next arrows, "Back to today", the ranked list, name search, Claim-a-rank, Send-a-gift menu, Boost pills, and the "About [date] birthdays" section.
3. **Claim a birthday**: date + bid, photo, name (≤40 chars), bio (≤80 chars), up to 3 gift links, color theme, email → **Stripe Checkout**.
4. **Claimed / share**: confirmation, share buttons, preview of the link card.
5. **How it works**: 3 steps + FAQ, using the mockup wording (including "Can I raise my bid, or help a friend?").
6. **Month pages** (SEO, `/october`). These are not in the mockup. See 06-seo.md.
7. **Hidden admin view**.

## 8. Emails (Resend)
| # | Email | Trigger / recipients | Content |
|---|---|---|---|
| 1 | **Claim confirmation** | Claimer, after payment | Rank, share link, and a note that we'll email them if they're passed. **Doubles as the receipt.** |
| 2 | **Boost receipt** | The person who boosted | New total + share link |
| 3 | **Outbid alert** | When someone **loses #1**: sent to them **and everyone on their alert list** | "[Name] just got passed on [date]. Boost to take #1 back." The link opens the Boost box with the amount pre-filled |
| 4 | **Birthday reminder** | Homepage signup (month, day, email) | **One email a year, a week before** their birthday |
| 5 | **"Your day is here"** | **Morning of the date**, to **everyone on that day's list** | Their rank + share link |
| 6 | **"You got boosted"** | The birthday person, when someone boosts them | **Bundle into one email about every hour** |
| 7 | **Yearly re-claim** | Everyone who claimed a date is **automatically added to the birthday reminder** for next year | Reminder |
| 8 | **Admin alert** | The client, on each new claim | A copy of the claim, for moderation |

Rules:
- Send outbid alerts **only when someone loses #1**, not for lower ranks.
- Send each person **at most one outbid alert per 15 minutes**, showing the **latest amount needed**.
- Reminder, "your day is here" and re-claim emails **need an unsubscribe link**.

## 9. Sharing
- Phone's built-in share menu (Web Share API), **Facebook**, **text message** (sms:), and **copy link**.
- A **link preview (OG) image for each date page**. The mockup shows the card: theme ground color, avatar circle, "TODAY'S BIRTHDAY", the date, the name, and below it "It's Sam's birthday on bday.lol" + the URL.

## 10. Admin (hidden admin view)
- **Remove an offensive photo, name or bio.**
- **Add birthdays manually** to any date (name, photo, bio, color theme, up to 3 gift links) with a bid amount the admin sets, **without Stripe**. These are for free featured spots for influencers. They must **look identical to paid listings**, be marked internally as **"comped"** (excluded from revenue reports), and be **editable and removable**.
- **"Hide this person"** for the famous-birthdays list, so the next name moves up.
- Receives the admin alert email (#8) for each claim.

## 11. SEO
See [06-seo.md](06-seo.md). In short: 366 `/october-7` pages and 12 `/october` pages, SSR, unique title, description and OG image per date, the "About" section, a sitemap, Search Console, and noindex on claim, checkout and search pages.

## 12. Build note (architecture requirement from the client)
> Build the leaderboard as a general **"board"** with **"entries"** and **"boosts"**, not hardcoded to birthdays.
> Birthdays should be one *type* of board (one per date). Later we may add other boards, like a fundraising contest.
> Keep dates, colors and wording as **settings on the board** where you can.

## 13. Design rules (summary, full detail in 04)
- Every button and clickable card has a hover state. On hover it **lifts 2px up and 2px left** with a small **black offset shadow** (4px 4px 0 #141414). **Button colors don't change.** On click it presses back down. **Hover effects only on devices with a mouse** (`@media (hover: hover)`).
- Gift menu options use the #1's accent color, with black text and a black border.

## 14. Not in v1
Gift cards, Stripe Connect payouts, and "Boosted by X fans" / "Top fans" displays. Also not yet: the Past winners section and licensed Famous Birthdays data.
