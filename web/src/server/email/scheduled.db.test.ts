import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { outbidAlerts, payments, reminders } from "@/db/schema";
import { saveReminder } from "@/server/reminders";
import { addBirthdayType, inRollback, type Tx } from "@/test/db";
import { memoryMailer } from "@/test/mailer";
import { paidBoost, paidClaim } from "@/test/money";
import { ensureBoard } from "../boards";
import { runEmailTick, sendBoostDigests, sendDueOutbidAlerts, sendReminders, sendYourDayEmails } from "./scheduled";
import { unsubscribe } from "./suppressions";

const oct7 = { month: 10, day: 7 };
const at = (hhmm: string, date = "2026-10-07") => new Date(`${date}T${hhmm}:00-04:00`);

beforeEach(() => {
  vi.stubEnv("ADMIN_ALERT_EMAIL", "");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://mybday.lol");
});
afterEach(() => vi.unstubAllEnvs());

async function oct7Board(tx: Tx) {
  const type = await addBirthdayType(tx);
  return ensureBoard(tx, type, oct7, 2026);
}

describe("outbid alerts", () => {
  it("emails the passed person and their fans the amount needed at send time", async () => {
    await inRollback(async (tx) => {
      const board = await oct7Board(tx);
      const jess = await paidClaim(tx, board.id, { md: oct7, name: "Jess Moreno", usd: 230, email: "jess@example.com", at: at("09:00") });
      await paidBoost(tx, jess.entryId, { usd: 10, email: "fan@example.com", at: at("10:00"), alert: true });
      const tyler = await paidClaim(tx, board.id, { md: oct7, name: "Tyler Brooks", usd: 241, email: "tyler@example.com", at: at("14:40") });
      // Tyler pulls further ahead before the cron runs.
      await paidBoost(tx, tyler.entryId, { usd: 10, email: "tyler@example.com", at: at("14:41") });
      const mailer = memoryMailer();

      expect(await sendDueOutbidAlerts(tx, mailer, at("14:42"))).toMatchObject({ sent: 2, failed: 0 });
      const [owner] = mailer.to("jess@example.com");
      expect(owner?.subject).toBe("You got passed on October 7");
      expect(owner?.text).toContain("#1 Tyler Brooks (Just took the top spot): $251");
      expect(owner?.text).toContain("#2 You: $240");
      expect(owner?.text).toContain("Take #1 back for $12");
      expect(owner?.text).toContain("October 7 ends at midnight ET.");
      expect(owner?.text).toMatch(/Boost \$12: https:\/\/mybday\.lol\/october-7\?boost=\w+&amount=12/);
      const [fan] = mailer.to("fan@example.com");
      expect(fan?.subject).toBe("Jess got passed on October 7");

      expect(await sendDueOutbidAlerts(tx, mailer, at("14:43"))).toMatchObject({ sent: 0 });
    });
  });

  it("sends nothing once they're #1 again", async () => {
    await inRollback(async (tx) => {
      const board = await oct7Board(tx);
      const jess = await paidClaim(tx, board.id, { md: oct7, name: "Jess Moreno", usd: 240, email: "jess@example.com", at: at("09:00") });
      await paidClaim(tx, board.id, { md: oct7, name: "Tyler Brooks", usd: 241, email: "tyler@example.com", at: at("14:40") });
      await paidBoost(tx, jess.entryId, { usd: 5, email: "jess@example.com", at: at("14:41") });
      const mailer = memoryMailer();

      await sendDueOutbidAlerts(tx, mailer, at("14:42"));
      expect(mailer.to("jess@example.com")).toEqual([]);
    });
  });

  it("drops alerts for a day that has ended", async () => {
    await inRollback(async (tx) => {
      const board = await oct7Board(tx);
      await paidClaim(tx, board.id, { md: oct7, name: "Jess Moreno", usd: 240, email: "jess@example.com", at: at("09:00") });
      await paidClaim(tx, board.id, { md: oct7, name: "Tyler Brooks", usd: 241, email: "tyler@example.com", at: at("23:50") });
      const mailer = memoryMailer();

      await sendDueOutbidAlerts(tx, mailer, at("00:01", "2026-10-08"));
      expect(mailer.sent).toEqual([]);
      expect(await tx.select().from(outbidAlerts)).toEqual([]);
    });
  });

  it("sends each person at most one alert per 15 minutes", async () => {
    await inRollback(async (tx) => {
      const board = await oct7Board(tx);
      const oct8 = await ensureBoard(tx, (await tx.query.boardTypes.findFirst())!, { month: 10, day: 8 }, 2026);
      const jess = await paidClaim(tx, board.id, { md: oct7, name: "Jess Moreno", usd: 240, email: "jess@example.com", at: at("09:00") });
      const marcus = await paidClaim(tx, oct8.id, { md: { month: 10, day: 8 }, name: "Marcus T", usd: 80, email: "marcus@example.com", at: at("09:00") });
      // The same fan follows both, and both get passed in the same minute.
      await paidBoost(tx, jess.entryId, { usd: 2, email: "fan@example.com", at: at("10:00"), alert: true });
      await paidBoost(tx, marcus.entryId, { usd: 2, email: "fan@example.com", at: at("10:00"), alert: true });
      await paidClaim(tx, board.id, { md: oct7, name: "Tyler Brooks", usd: 300, email: "tyler@example.com", at: at("14:40") });
      await paidClaim(tx, oct8.id, { md: { month: 10, day: 8 }, name: "Ana Lee", usd: 100, email: "ana@example.com", at: at("14:40") });
      const mailer = memoryMailer();

      await sendDueOutbidAlerts(tx, mailer, at("14:41"));
      expect(mailer.to("fan@example.com")).toHaveLength(1);
      expect(await sendDueOutbidAlerts(tx, mailer, at("14:50"))).toMatchObject({ sent: 0 });
      expect(mailer.to("fan@example.com")).toHaveLength(1);

      await sendDueOutbidAlerts(tx, mailer, at("14:56"));
      expect(mailer.to("fan@example.com").map((e) => e.subject).sort()).toEqual([
        "Jess got passed on October 7",
        "Marcus got passed on October 8",
      ]);
    });
  });
});

describe("You got boosted digest", () => {
  it("bundles boosts from others, then waits an hour before the next one", async () => {
    await inRollback(async (tx) => {
      const board = await oct7Board(tx);
      const sam = await paidClaim(tx, board.id, { md: oct7, name: "Sam Rivera", usd: 100, email: "sam@example.com", at: at("09:00") });
      await paidBoost(tx, sam.entryId, { usd: 5, email: "a@example.com", at: at("13:12") });
      await paidBoost(tx, sam.entryId, { usd: 10, email: "b@example.com", at: at("13:40") });
      await paidBoost(tx, sam.entryId, { usd: 20, email: "Sam@example.com", at: at("13:41") }); // their own: not in the digest
      const mailer = memoryMailer();

      expect(await sendBoostDigests(tx, mailer, at("13:45"))).toMatchObject({ sent: 1 });
      const [digest] = mailer.to("sam@example.com");
      expect(digest?.subject).toBe("2 people boosted you +$15");
      expect(digest?.text).toContain("1:12 PM ET: +$5");
      expect(digest?.text).toContain("1:40 PM ET: +$10");
      expect(digest?.text).not.toContain("+$20");
      expect(digest?.text).toContain("Unsubscribe: https://mybday.lol/unsubscribe?t=");
      expect(digest?.html).not.toContain("a@example.com");
      const pending = await tx.select().from(payments).where(eq(payments.kind, "boost"));
      expect(pending.every((p) => p.digestSentAt?.getTime() === at("13:45").getTime())).toBe(true);

      await paidBoost(tx, sam.entryId, { usd: 5, email: "c@example.com", at: at("14:00") });
      expect(await sendBoostDigests(tx, mailer, at("14:30"))).toMatchObject({ sent: 0 });
      await sendBoostDigests(tx, mailer, at("14:46"));
      expect(mailer.to("sam@example.com").map((e) => e.subject)).toEqual(["2 people boosted you +$15", "Someone boosted you +$5"]);
    });
  });

  it("skips people who unsubscribed, without keeping their boosts queued", async () => {
    await inRollback(async (tx) => {
      const board = await oct7Board(tx);
      const sam = await paidClaim(tx, board.id, { md: oct7, name: "Sam Rivera", usd: 100, email: "sam@example.com", at: at("09:00") });
      await unsubscribe(tx, "sam@example.com", "boost_digest", at("09:30"));
      await paidBoost(tx, sam.entryId, { usd: 5, email: "a@example.com", at: at("10:00") });
      const mailer = memoryMailer();

      await sendBoostDigests(tx, mailer, at("10:01"));
      expect(mailer.sent).toEqual([]);
      const [boost] = await tx.select().from(payments).where(eq(payments.kind, "boost"));
      expect(boost?.digestSentAt).not.toBeNull();
    });
  });
});

describe("Your day is here", () => {
  it("goes to everyone on today's list from 8 AM ET, once", async () => {
    await inRollback(async (tx) => {
      const board = await oct7Board(tx);
      await paidClaim(tx, board.id, { md: oct7, name: "Jess Moreno", usd: 240, email: "jess@example.com", at: at("06:00", "2026-10-01") });
      await paidClaim(tx, board.id, { md: oct7, name: "Sam Rivera", usd: 100, email: "sam@example.com", at: at("06:00", "2026-10-01") });
      await paidClaim(tx, board.id, { md: oct7, name: "Ana Lee", usd: 50, email: "ana@example.com", at: at("06:00", "2026-10-01") });
      await unsubscribe(tx, "ana@example.com", "your_day", at("06:00", "2026-10-01"));
      const mailer = memoryMailer();

      expect(await sendYourDayEmails(tx, mailer, at("07:59"))).toMatchObject({ sent: 0 });
      expect(await sendYourDayEmails(tx, mailer, at("08:00"))).toMatchObject({ sent: 2 });
      const [jess] = mailer.to("jess@example.com");
      expect(jess?.subject).toBe("Happy birthday, Jess! 🎂");
      expect(jess?.text).toContain("You're on the mybday.lol homepage today.");
      const [sam] = mailer.to("sam@example.com");
      expect(sam?.text).toContain("You're #2 on today's board.");
      expect(mailer.to("ana@example.com")).toEqual([]);

      expect(await sendYourDayEmails(tx, mailer, at("09:00"))).toMatchObject({ sent: 0 });
      expect(mailer.sent).toHaveLength(2);
    });
  });
});

describe("reminders", () => {
  const sep30 = (hhmm: string, year = 2026) => at(hhmm, `${year}-09-30`);

  it("go out a week before, from 8 AM ET, once a year", async () => {
    await inRollback(async (tx) => {
      const board = await oct7Board(tx);
      await saveReminder(tx, { month: 10, day: 7, email: "new@example.com" });
      await saveReminder(tx, { month: 10, day: 7, email: "gone@example.com" });
      await unsubscribe(tx, "gone@example.com", "reminders", sep30("06:00"));
      await tx.insert(reminders).values({ email: "last-year@example.com", month: 10, day: 7, source: "claim" });
      // Already on this year's board: no reminder needed.
      await paidClaim(tx, board.id, { md: oct7, name: "Cara Diaz", usd: 40, email: "cara@example.com", at: sep30("06:00") });
      const mailer = memoryMailer();

      expect(await sendReminders(tx, mailer, sep30("07:30"))).toMatchObject({ sent: 0 });
      expect(await sendReminders(tx, mailer, sep30("08:00"))).toMatchObject({ sent: 2 });

      const [signup] = mailer.to("new@example.com");
      expect(signup?.subject).toBe("October 7 is in a week");
      expect(signup?.text).toContain("The top bid is $40.");
      expect(signup?.text).toContain("Own October 7 for $41");
      expect(signup?.text).toContain("Claim October 7: https://mybday.lol/claim?date=october-7");
      expect(signup?.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
      const [again] = mailer.to("last-year@example.com");
      expect(again?.subject).toBe("Claim October 7 again");
      expect(mailer.to("cara@example.com")).toEqual([]);
      expect(mailer.to("gone@example.com")).toEqual([]);

      expect(await sendReminders(tx, mailer, sep30("12:00"))).toMatchObject({ sent: 0 });

      // A year later the board is fresh and they hear from us again.
      await sendReminders(tx, mailer, sep30("08:00", 2027));
      expect(mailer.to("new@example.com")).toHaveLength(2);
      expect(mailer.to("new@example.com")[1]?.text).toContain("Nobody has claimed it yet.");
    });
  });
});

describe("runEmailTick", () => {
  it("runs every scheduled sender", async () => {
    await inRollback(async (tx) => {
      const board = await oct7Board(tx);
      await paidClaim(tx, board.id, { md: oct7, name: "Jess Moreno", usd: 240, email: "jess@example.com", at: at("06:00", "2026-10-01") });
      await saveReminder(tx, { month: 10, day: 14, email: "soon@example.com" });
      const mailer = memoryMailer();

      const run = await runEmailTick(tx, mailer, at("08:00"));
      expect(run).toMatchObject({ sent: 2, failed: 0 });
      expect(mailer.sent.map((e) => e.subject).sort()).toEqual(["Happy birthday, Jess! 🎂", "October 14 is in a week"]);
    });
  });
});
