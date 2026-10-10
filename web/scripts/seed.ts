// Fills the LOCAL database with the mockup's demo data, placed on today's real date (ET).
// Respects DEV_NOW, so `DEV_NOW=... pnpm db:reset` seeds around any moment you want to test.
import { assertLocalDatabase } from "./load-env";
import { sql } from "drizzle-orm";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import type { ThemeKey } from "@/config/themes";
import { db } from "@/db";
import {
  alertSubscriptions,
  boardTypes,
  entries,
  leaderLog,
  payments,
  reminders,
  type GiftLink,
} from "@/db/schema";
import { formatLong, nextDates, startOfDayIn, zonedDate, type MonthDay } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { publicId } from "@/lib/ids";
import { ensureCurrentBoard } from "@/server/boards";
import { freeSlug } from "@/server/payments";

assertLocalDatabase();

type Person = {
  name: string;
  bio: string;
  theme: ThemeKey;
  totalUsd: number;
  gifts?: GiftLink[];
  /** Optional boost on top of the claim (claim = total - boost). */
  boostUsd?: number;
};

// "Find your birthday" demo board from the mockup (Day.dc.html, handoff v2: 34 people).
const TODAY_PEOPLE: Person[] = [
  {
    name: "Jess Moreno", bio: "30 and still can't cook. Pizza money appreciated.", theme: "lime", totalUsd: 240, boostUsd: 40,
    gifts: [
      { service: "venmo", url: "https://venmo.com/u/jessmoreno" },
      { service: "cashapp", url: "https://cash.app/$jessmoreno" },
    ],
  },
  { name: "Tyler Brooks", bio: "Big 4-0. Be nice to me.", theme: "sky", totalUsd: 225, gifts: [{ service: "throne", url: "https://throne.com/tylerbrooks" }] },
  { name: "Ana Reyes", bio: "Birthday twins with my grandma.", theme: "apricot", totalUsd: 150, gifts: [{ service: "amazon", url: "https://www.amazon.com/hz/wishlist/ls/ANAREYES123" }] },
  { name: "Chris Wu", bio: "Send tacos.", theme: "mint", totalUsd: 60, gifts: [{ service: "venmo", url: "https://venmo.com/u/chriswu" }] },
  // A child, added by a parent: first name only and no gift links (handoff v2 §8).
  { name: "Maya", bio: "Our girl turns 7 today! (Added by her mom)", theme: "bubblegum", totalUsd: 40 },
  { name: "Jordan Lee", bio: "Quarter century. Feeling ancient.", theme: "butter", totalUsd: 25, gifts: [{ service: "cashapp", url: "https://cash.app/$jordanlee" }] },
  { name: "Sam Ortiz", bio: "Just happy to be here.", theme: "seafoam", totalUsd: 10 },
  { name: "Riley Kim", bio: "Low budget, high spirits.", theme: "orchid", totalUsd: 5, gifts: [{ service: "throne", url: "https://throne.com/rileykim" }] },
  // Handoff v2 adds 26 more, so the board pages ("Show 20 more") and has ties at $5.
  { name: "Leo Martins", bio: "Another lap around the sun.", theme: "sky", totalUsd: 9 },
  { name: "Kofi Mensah", bio: "Cake is a food group.", theme: "lime", totalUsd: 9 },
  { name: "Hannah Becker", bio: "Just here for the cake.", theme: "mint", totalUsd: 8 },
  { name: "Aiko Tanaka", bio: "Same day as my cat. Respect.", theme: "butter", totalUsd: 8 },
  { name: "Dev Nolan", bio: "Born on a Tuesday. Still recovering.", theme: "periwinkle", totalUsd: 8 },
  { name: "Lucía Gómez", bio: "Birthday week is a lifestyle.", theme: "apricot", totalUsd: 7 },
  { name: "Nate Brooks", bio: "Level 31 unlocked.", theme: "seafoam", totalUsd: 7 },
  { name: "Ella Fischer", bio: "Cake first, questions later.", theme: "orchid", totalUsd: 7 },
  { name: "Omar Haddad", bio: "Bought my own birthday. No regrets.", theme: "lavender", totalUsd: 6 },
  { name: "Grace Liu", bio: "Wish me luck at bowling tonight.", theme: "blush", totalUsd: 6 },
  { name: "Ben Carter", bio: "Officially old.", theme: "cloud", totalUsd: 6 },
  { name: "Zoe Martin", bio: "Sending good vibes only.", theme: "bubblegum", totalUsd: 6 },
  { name: "Ivan Petrov", bio: "First time trying this.", theme: "sky", totalUsd: 5 },
  { name: "Mia Rossi", bio: "Hi mom.", theme: "lime", totalUsd: 5 },
  { name: "Theo Baker", bio: "Free pizza accepted.", theme: "mint", totalUsd: 5 },
  { name: "Nora Quinn", bio: "Another year wiser. Maybe.", theme: "butter", totalUsd: 5 },
  { name: "Caleb Ward", bio: "Birthday boy, reporting in.", theme: "apricot", totalUsd: 5 },
  { name: "Isla Brown", bio: "Pls send dog pics.", theme: "seafoam", totalUsd: 5 },
  { name: "Felix Wong", bio: "Turning 22 again.", theme: "periwinkle", totalUsd: 5 },
  { name: "Ruby Hall", bio: "Here for a good time.", theme: "orchid", totalUsd: 5 },
  { name: "Max Weber", bio: "Low key celebrating.", theme: "lavender", totalUsd: 5 },
  { name: "Sofia Cruz", bio: "Birthday month starts now.", theme: "blush", totalUsd: 5 },
  { name: "Jack Evans", bio: "No speeches please.", theme: "cloud", totalUsd: 5 },
  { name: "Layla Ahmed", bio: "Thirty, flirty, thriving.", theme: "bubblegum", totalUsd: 5 },
  { name: "Owen Price", bio: "Coffee money welcome.", theme: "sky", totalUsd: 5 },
  { name: "Chloe Adams", bio: "I made it another year.", theme: "lime", totalUsd: 5 },
];

// Homepage "Coming up" demo (Main.dc.html): +1, +2, +3 (unclaimed), +4 days.
const UPCOMING: Array<Person | null> = [
  { name: "Marcus Thompson", bio: "Finally old enough to rent a car.", theme: "periwinkle", totalUsd: 85 },
  { name: "Priya Shah", bio: "Treat yourself, but also treat me.", theme: "orchid", totalUsd: 410 },
  null,
  { name: "Dev Nolan", bio: "Birthday week is a lifestyle.", theme: "seafoam", totalUsd: 12 },
];

const cents = (usd: number) => usd * 100;
const emailFor = (name: string) => `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`;
let sessionCounter = 0;
const fakeSession = () => `cs_test_seed_${String(++sessionCounter).padStart(4, "0")}`;

const at = now();
const tz = BIRTHDAY_BOARD_TYPE.settings.timezone;
const today = zonedDate(at, tz);

await db.transaction(async (tx) => {
  await tx.execute(sql`TRUNCATE board_types, boards, entries, payments, leader_log, alert_subscriptions,
    outbid_alerts, reminders, email_suppressions, email_log, famous_people, famous_hidden RESTART IDENTITY CASCADE`);

  const [type] = await tx.insert(boardTypes).values(BIRTHDAY_BOARD_TYPE).returning();

  async function addPerson(md: MonthDay, person: Person, reachedAt: Date, claimedAt: Date) {
    const board = await ensureCurrentBoard(tx, type!, md, at);
    const [entry] = await tx
      .insert(entries)
      .values({
        publicId: publicId(),
        boardId: board.id,
        slug: await freeSlug(tx, board.id, person.name),
        name: person.name,
        bio: person.bio,
        theme: person.theme,
        giftLinks: person.gifts ?? [],
        ownerEmail: emailFor(person.name),
        totalCents: cents(person.totalUsd),
        totalReachedAt: reachedAt,
        status: "live",
        createdAt: claimedAt,
        liveAt: claimedAt,
      })
      .returning();

    const boost = person.boostUsd ?? 0;
    await tx.insert(payments).values({
      entryId: entry!.id, kind: "claim", status: "paid", amountCents: cents(person.totalUsd - boost),
      email: emailFor(person.name), stripeSessionId: fakeSession(), createdAt: claimedAt, paidAt: claimedAt,
    });
    if (boost > 0) {
      await tx.insert(payments).values({
        entryId: entry!.id, kind: "boost", status: "paid", amountCents: cents(boost), email: "fan@example.com",
        alertOptIn: true, stripeSessionId: fakeSession(), createdAt: reachedAt, paidAt: reachedAt,
      });
      await tx.insert(alertSubscriptions).values({ entryId: entry!.id, email: "fan@example.com" });
    }
    return { board, entry: entry! };
  }

  // Today's board. #1 changed hands twice, like the mockup's "held" lines:
  // Ana from midnight, Tyler from 40% of the day so far, Jess from 80%.
  const dayStart = startOfDayIn(at, tz);
  const elapsed = Math.max(at.getTime() - dayStart.getTime(), 60_000);
  const t = (fraction: number) => new Date(dayStart.getTime() + elapsed * fraction);

  const reach = [0.8, 0.4, 0.0, 0.5, 0.55, 0.6, 0.65, 0.7];
  const claims = [0.3, 0.4, 0.0, 0.5, 0.55, 0.6, 0.65, 0.7];
  const added = [];
  for (const [i, person] of TODAY_PEOPLE.entries()) {
    // The rest joined later in the day, in list order (so ties keep the mockup's order).
    const later = 0.7 + (i - 7) * 0.008;
    added.push(await addPerson(today, person, t(reach[i] ?? later), t(claims[i] ?? later)));
  }
  const [jess, tyler, ana] = added;
  await tx.insert(leaderLog).values([
    { boardId: ana!.board.id, entryId: ana!.entry.id, startedAt: t(0), endedAt: t(0.4) },
    { boardId: tyler!.board.id, entryId: tyler!.entry.id, startedAt: t(0.4), endedAt: t(0.8) },
    { boardId: jess!.board.id, entryId: jess!.entry.id, startedAt: t(0.8) },
  ]);

  // Coming up.
  const upcomingDates = nextDates(today, UPCOMING.length);
  for (const [i, person] of UPCOMING.entries()) {
    if (!person) continue;
    const { month, day } = upcomingDates[i]!;
    const md = { month, day };
    const { board, entry } = await addPerson(md, person, t(0.5), t(0.5));
    await tx.insert(leaderLog).values({ boardId: board.id, entryId: entry.id, startedAt: t(0.5) });
  }

  // A homepage reminder signup.
  await tx.insert(reminders).values({ email: "reminder@example.com", month: 3, day: 14, source: "signup" });
});

console.log(
  `Seeded: ${TODAY_PEOPLE.length} people on ${formatLong(today)} (today, ET), ` +
    `${UPCOMING.filter(Boolean).length} upcoming claims, 1 reminder. Clock: ${at.toISOString()}`,
);
process.exit(0);
