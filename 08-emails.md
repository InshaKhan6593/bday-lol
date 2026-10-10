# 08: Emails (content and design)

The 8 emails from the spec (§8 in [02-product-spec.md](02-product-spec.md)), what each one says, and why.
The wording lives in `web/src/lib/email-templates.ts`; the look in `web/src/lib/email-render.ts`.
**Preview all of them** at http://localhost:3000/dev/emails (development only), at inbox and phone width.

## What good emails like these do (research, 2026-10-09)

| Rule | Source |
|---|---|
| The **subject tells the whole story** (what happened, with names, dates, amounts) so nobody has to open the email. Plain beats clever. **~50 characters or less** so phones don't cut it off | [Postmark](https://postmarkapp.com/guides/transactional-email-best-practices), [Zoho ZeptoMail](https://www.zoho.com/zeptomail/articles/transactional-email-subject-lines.html) |
| The **preview line adds the next fact** (outcome or next step) and never repeats the subject | [Zoho ZeptoMail](https://www.zoho.com/zeptomail/articles/using-email-preheaders.html), [Spotler](https://spotler.com/blog/unfolding-the-email-sender-name-subject-line-and-pre-header) |
| Transactional emails are **expected, timely, actionable and plain**: sent right after the event, **one call to action**, little decoration | [Postmark best-practice skills](https://www.skills.sh/activecampaign/postmark-skills/postmark-email-best-practices) |
| Reminders are **short (2–3 sentences)** with one clear action and the date | [Grammarly](https://www.grammarly.com/blog/business-writing/reminder-email/), [Bluehost](https://www.bluehost.com/blog/reminder-email-guide/), [Constant Contact](https://www.constantcontact.com/blog/email-reminders/) |
| **Outbid emails** show the current top bid and a "bid again" button **pre-filled with the amount that takes the lead**. Bidders complain when the top bid is missing | [RallyUp](https://rallyup.com/learn/how-to-increase-your-auction-bid/), [32auctions](https://www.32auctions.com/silent-auctions/silent-auction-marketing-templates), [DomainInvesting on GoDaddy](https://domaininvesting.com/godaddy-auctions-outbid-email-should-have-high-bid-amount) |
| **Birthday emails** lead with warmth and the **first name**, are short, often use one emoji, and arrive **on the day** | [Email Love](https://emaillove.com/subject-lines/birthday), [MailCharts](https://www.mailcharts.com/email-examples/birthdays) |
| Use **exact times** ("midnight ET") instead of "soon" | [Postmark](https://postmarkapp.com/guides/transactional-email-best-practices) |
| **Digests** group activity per item and show the numbers; urgent alerts never wait for a digest | [SuprSend](https://docs.suprsend.com/docs/best-practises-for-batching-digest), [Novu](https://novu.co/blog/digest-notifications-best-practices-example/) |
| **From name** is the product ("bday.lol"), and **replies reach a real inbox** (no "noreply") | [Postmark](https://postmarkapp.com/guides/transactional-email-best-practices) |
| A **postal address** in the footer adds trust (required for marketing-style mail such as reminders) | [Autopilot / SendGrid](https://blog.autopilothq.com/transactional-email-best-practices/) |

Plus our own voice, from the mockup: short and punchy ("One birthday. The whole internet." / "October 7 is yours. For now." / "Getting outbid is part of the game.").

## Design

Same design language as the app (and close to Gumroad's neo-brutalist emails): the person's **theme ground** as the background,
a **kicker over a giant title** (the homepage hero), a **white card with ink outlines and a hard shadow** (a thick bottom-right
border, because Gmail strips `box-shadow`), the **black claim bar with an accent button**, **avatar circles**.
Bricolage Grotesque loads where inboxes allow web fonts (Apple Mail, iOS); others fall back to Helvetica.

**Panels (redesigned 2026-10-10, after comparing with Apple's, Nike's and Stripe's receipts).** Every table is now one
panel: an ink-outlined box with a strip in the person's color (title on the left, receipt number on the right), lines
with the amount on the right, a dashed rule, a bold total, and small uppercase labels over values in a grey footer.
Long values (emails, links) take a full row so they don't break mid-word on phones.

| Email | Panel |
|---|---|
| 1 Claim confirmation | **Receipt No. MB-4F7K2A9C**: "Claim · October 7, 2026" with **TOTAL PAID $241** once on the right (a single item's amount is the total, so it isn't repeated), then Paid on / Payment ("Visa •••• 4242") / Charged ("GBP 192.00" when Adaptive Pricing converted it) |
| 2 Boost receipt | Same receipt: "Boost for Jess Moreno, adds to Jess's total on October 7" |
| 3 Outbid alert | Redesigned like auction outbid alerts (see below) |
| 6 You got boosted | **3 boosts**: one line per boost with its time. No total row: the title already says +$25 |
| 8 Admin alert | **Claim details** with the same receipt number as the claimer's, then email, color, child flag and gift links (the photo is in the avatar circle; initials when there is none) |

- **No repeats**: each fact appears once. Under the person's name goes their **bio** (how they look on the board),
  except in the boost receipt and digest, where it's their new standing ("$265 · #1 on October 7") and the sentence
  doesn't say it again.
- **One look for every email**: a big centered line says the news ("$5 makes it yours", "You're on the homepage",
  "Maya is #5 today", "$2 takes #1 back"), then **one full-width black button**. The black claim bar inside the card is
  gone (a box in a box).
- **Mini leaderboard** (2026-10-10, from game emails: Strava's "Uh oh / Dethroned!" crown alerts and Duolingo-style
  league tables, which show you next to the people around you rather than the whole list). Used in the claim
  confirmation, the outbid alert and "Your day is here", in place of the avatar row. Rows: #1 with a 👑, then the row
  above you, you and the row below ("• • •" where ranks are skipped, at most 5 rows). Your row is lifted like the app's
  #1 card: filled with your color, a thicker ink edge and a hard shadow, a black **YOU** tag. The outbid alert tags the
  new leader **NEW #1** and your row **Was #1**; a fan's alert highlights the person they follow without "YOU".
- **Outbid alert** (redesigned 2026-10-10 from auction outbid alerts: 32auctions, Givebutter, HikaShop, Charity Auctions
  Today, which all show the item, who's ahead, the amount that wins it back, when bidding closes, and one "bid again"
  link). Subject **You've been outbid on October 7** (a fan gets **Jess was outbid on October 7**). The mini leaderboard
  (👑 Tyler Brooks **NEW #1** $241, then your lifted row "Jess Moreno **YOU**, Was #1, $240", then #3). Then a big
  **$2 takes #1 back** with "Bidding on October 7 closes tonight at midnight ET." and one full-width button
  **Boost $2 and retake #1**.
- **Receipt number**: `MB-` + the first 8 characters of our payment id. Stripe keeps the full id as `metadata.paymentId`,
  so support can search for it there.
- **Card**: read from Stripe (the PaymentIntent's charge) when the webhook lands, saved as `payments.payment_method`. If
  Stripe can't be reached the payment still goes through and the receipt leaves the card out.
- **Every email**: invisible padding after the preview line (otherwise inboxes show the start of the body next to the
  subject) and "mybday.lol · FAQ · Terms · Privacy" in the footer, like the site.
- **Dark mode**: we ask for light only, but the Gmail app on Android forces dark anyway. Checked with Chromium's forced
  dark mode: everything stays readable. Black buttons and the black bar have a thin `#3d3d3d` edge so they don't vanish
  into the darkened card. Still to do before launch: check on a real phone in Gmail, Apple Mail and Outlook.

## The emails

Every email: one button (or one claim bar), a receipt wherever money changed hands, a "why you're getting this" line.
Unsubscribe links on 4, 5, 6 and 7 (spec §8). "Jess", "October 7" and amounts below are examples.

| # | Email | When / to whom | Subject | Preview line | Body + button |
|---|---|---|---|---|---|
| 1 | **Claim confirmation** (is the receipt) | Right after payment, to the claimer | Today's #1: **October 7 is yours. For now.** · Later date: **October 12 is yours. For now.** · Passed while paying: **You're #3 on October 7** | "You're on the homepage with $241." / "$91 more takes #1. Friends can boost you from your page." | Avatar row ($241 · #1). One line: on the homepage until midnight ET, we'll email you if outbid (rank 2+: how much takes #1). **Share your link**. Receipt. "Bids are final. Questions? Just reply." |
| 2 | **Boost receipt** | Right after payment, to the booster (Stripe's email) | **Your $16 boost for Tyler is in** | "Tyler is #1 on October 9 with $241." | Title "+$16". Standing, plus "We'll email you if Tyler gets passed" when ticked. **Share Tyler's day**. Receipt. "Paid to bday.lol, not to Tyler." |
| 3 | **Outbid alert** | When someone loses #1 (max 1 per person per 15 min), to them and their alert list | **You've been outbid on October 7** / **Jess was outbid on October 7** | "Tyler has $241. $2 takes #1 back." | Tiles "#1 NOW Tyler Brooks $241" vs "#2 NOW You $240", **$2 takes #1 back**, when bidding closes, **Boost $2 and retake #1** (opens the Boost box pre-filled) |
| 4 | **Birthday reminder** | 7 days before, homepage signups | **October 7 is in a week** | "Claim it before someone else does. Nobody has claimed it yet." | One line, then **$5 makes it yours** / "Nobody has claimed it yet.", **Claim October 7** |
| 5 | **Your day is here** | 8:00 AM ET on the day, everyone on that day's list | **Happy birthday, Jess! 🎂** | "You're on the bday.lol homepage today. Your gift buttons are live." | Avatar row with their bio, then **You're on the homepage** (or **You're #3 today**) / "Your gift buttons are live…", **Share your link**. A child's listing (07 D4) goes to the parent: **Happy birthday to Maya! 🎂**, "Maya is #5 on today's board. Share the link so family and friends can celebrate with Maya.", no gift wording |
| 6 | **You got boosted** | About once an hour, bundled, to the birthday person | **3 people boosted you +$25** / **Someone boosted you +$5** | "You're #1 on October 7 with $265." | Title "+$25". Each boost with its time ("1:12 PM ET  +$5"); never who boosted. **Share your link** |
| 7 | **Yearly re-claim** | 7 days before, last year's claimers (auto-added) | **Claim October 7 again** | "It's a week away and the board starts fresh. The top bid is $40." | "Last year you claimed October 7. Every year starts fresh…", then **$41 takes the top spot** / "The top bid right now is $40.", **Claim October 7** |
| 8 | **Admin alert** | Each new claim, to the client | **New claim: Sam Rivera, Oct 7, $241** | "#1 on October 7, 2026. Check the photo, name and bio." | Photo + name + bio, details table (paid, rank, email, color, gift links), **Open October 7's list**. A child's listing: **New child claim: Maya, Oct 7, $40**, a "Listing: Child (under 18)" row and "check it's a first name only" in the preview line |

## How they're sent (step 8)

Code in `web/src/server/email/`. Every send goes through `sendEmail`, which reserves a row in `email_log` by **dedupe key**
before sending, so Stripe retries and overlapping cron runs never send twice (a failed send frees the key for a retry).

| Email | Sent by | When | Dedupe key |
|---|---|---|---|
| 1, 8 | Stripe webhook | Right after the payment is credited. A failed send returns 500 so Stripe retries | `claim:` / `admin-claim:` + payment id |
| 2 | Stripe webhook | Right after the boost is credited | `boost-receipt:` + payment id |
| 3 | Webhook (instantly) + cron (throttled ones) | Re-checked at send time: no email if they're #1 again, were removed, or the day ended. Amount = what it takes **now**. Max 1 per person per 15 min, across everyone they follow | `outbid:` + alert id |
| 6 | Cron | First boost on the next tick, then at most one digest an hour. Boosts people paid on their own entry are left out | `digest:` + entry + last payment |
| 5 | Cron | From 8:00 AM ET on the day (also reaches people who claim later that day) | `your-day:` + entry id |
| 4, 7 | Cron | From 8:00 AM ET, exactly 7 days before. Skipped for anyone already on that date's board. Claimers are added to reminders (source `claim`) when their payment lands | `reminder:` + id + year |

- **Cron:** `vercel.json` calls `/api/cron/emails` every minute with `Authorization: Bearer $CRON_SECRET`. Locally run `pnpm -C web emails:tick` (honors `DEV_NOW`).
- **Transport:** `EMAIL_TRANSPORT=smtp` → Mailpit (http://localhost:8030); `resend` → Resend's SMTP relay with `RESEND_API_KEY`. `EMAIL_REPLY_TO` and `EMAIL_FOOTER_ADDRESS` fill in once the client sends them.
- **Unsubscribe** (emails 4–7): a link signed with `APP_SECRET` (email + category, no accounts). `/unsubscribe` asks before switching off (inbox link scanners open links); the inbox's own button POSTs to `/api/unsubscribe` (RFC 8058 `List-Unsubscribe-Post`). Categories: reminders (4 + 7), your-day (5), boost digest (6). Signing up for a reminder again turns reminders back on.

## Still needed from the client (07 C1, C2)

- The **reply-to inbox** for "Questions? Just reply" (a support email).
- A **postal address** for the footer (env `EMAIL_FOOTER_ADDRESS`).
- The sending domain verified in **Resend** (DNS records).
