import type { EmailContent } from "./email-render";
import {
  adminClaimEmail,
  boostDigestEmail,
  boostReceiptEmail,
  claimConfirmationEmail,
  outbidAlertEmail,
  reminderEmail,
  yourDayEmail,
} from "./email-templates";

/** The 8 emails filled with the mockup's demo people, for the dev preview page and its tests. */
export function sampleEmails(origin: string): Array<{ id: string; label: string; content: EmailContent; unsubscribe: boolean }> {
  const md = { month: 10, day: 7 };
  const dateUrl = `${origin}/october-7`;
  const tz = "America/New_York";
  const paidAt = new Date("2026-10-07T14:40:00-04:00");
  const sam = { name: "Sam Rivera", bio: "Turning 25 today. Tacos over cake, always and forever.", photoUrl: null, theme: "sky" as const };
  const jess = { name: "Jess Moreno", bio: "30 and still can't cook. Pizza money appreciated.", photoUrl: null, theme: "lime" as const };

  return [
    {
      id: "claim",
      label: "1. Claim confirmation (today's #1)",
      unsubscribe: false,
      content: claimConfirmationEmail({
        ...sam,
        md,
        year: 2026,
        currentYear: 2026,
        rank: 1,
        totalCents: 24_100,
        toTopCents: null,
        isToday: true,
        shareUrl: dateUrl,
        timeZone: tz,
        receipt: {
          amountCents: 24_100,
          presentment: { currency: "gbp", amount: 19_200 },
          paidAt,
          reference: "pi_3UOgwH…P2W",
          item: "Claim October 7, 2026 on bday.lol",
        },
      }),
    },
    {
      id: "claim-rank",
      label: "1b. Claim confirmation (passed while paying, #3)",
      unsubscribe: false,
      content: claimConfirmationEmail({
        ...sam,
        md,
        year: 2026,
        currentYear: 2026,
        rank: 3,
        totalCents: 15_000,
        toTopCents: 9_100,
        isToday: true,
        shareUrl: dateUrl,
        timeZone: tz,
        receipt: { amountCents: 15_000, presentment: null, paidAt, reference: null, item: "Claim October 7, 2026 on bday.lol" },
      }),
    },
    {
      id: "boost",
      label: "2. Boost receipt",
      unsubscribe: false,
      content: boostReceiptEmail({
        ...jess,
        md,
        rank: 1,
        totalCents: 24_500,
        alertOptIn: true,
        dateUrl,
        timeZone: tz,
        receipt: { amountCents: 500, presentment: { currency: "pkr", amount: 143_994 }, paidAt, reference: null, item: "Boost Jess Moreno on bday.lol" },
      }),
    },
    {
      id: "outbid",
      label: "3. Outbid alert (to the person passed)",
      unsubscribe: false,
      content: outbidAlertEmail({
        ...jess,
        md,
        isOwner: true,
        newTop: { name: "Tyler Brooks", totalCents: 24_100 },
        amountCents: 200,
        totalCents: 24_000,
        rank: 2,
        isToday: true,
        boostUrl: `${dateUrl}?boost=IYmnAmfGnX&amount=2`,
      }),
    },
    {
      id: "reminder",
      label: "4. Birthday reminder",
      unsubscribe: true,
      content: reminderEmail({ md, source: "signup", topTotalCents: null, minCents: 500, claimUrl: `${origin}/claim?date=october-7` }),
    },
    {
      id: "your-day",
      label: "5. Your day is here",
      unsubscribe: true,
      content: yourDayEmail({ ...jess, md, rank: 1, totalCents: 24_000, hasGiftLinks: true, dateUrl }),
    },
    {
      id: "digest",
      label: "6. You got boosted (hourly)",
      unsubscribe: true,
      content: boostDigestEmail({
        ...jess,
        md,
        boosts: [
          { amountCents: 500, at: new Date("2026-10-07T13:12:00-04:00") },
          { amountCents: 1_000, at: new Date("2026-10-07T13:40:00-04:00") },
          { amountCents: 1_000, at: new Date("2026-10-07T14:05:00-04:00") },
        ],
        totalCents: 26_500,
        rank: 1,
        dateUrl,
        timeZone: tz,
      }),
    },
    {
      id: "reclaim",
      label: "7. Yearly re-claim",
      unsubscribe: true,
      content: reminderEmail({ md, source: "claim", topTotalCents: 4_000, minCents: 4_100, claimUrl: `${origin}/claim?date=october-7` }),
    },
    {
      id: "admin",
      label: "8. Admin alert (new claim)",
      unsubscribe: false,
      content: adminClaimEmail({
        ...sam,
        md,
        year: 2026,
        amountCents: 24_100,
        rank: 1,
        email: "sam@example.com",
        giftLinks: [
          { service: "venmo", url: "https://venmo.com/u/samrivera" },
          { service: "throne", url: "https://throne.com/samrivera" },
        ],
        dateUrl,
      }),
    },
  ];
}
