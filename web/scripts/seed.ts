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

// "Find your birthday" demo list from the mockup (Day.dc.html).
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
  { name: "Maya Patel", bio: "Our girl turns 7 today!", theme: "bubblegum", totalUsd: 40, gifts: [{ service: "amazon", url: "https://www.amazon.com/hz/wishlist/ls/MAYAPATEL7" }] },
  { name: "Jordan Lee", bio: "Quarter century. Feeling ancient.", theme: "butter", totalUsd: 25, gifts: [{ service: "cashapp", url: "https://cash.app/$jordanlee" }] },
  { name: "Sam Ortiz", bio: "Just happy to be here.", theme: "seafoam", totalUsd: 10 },
  { name: "Riley Kim", bio: "Low budget, high spirits.", theme: "orchid", totalUsd: 5, gifts: [{ service: "throne", url: "https://throne.com/rileykim" }] },
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
    added.push(await addPerson(today, person, t(reach[i]!), t(claims[i]!)));
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
