import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { emailLog, reminders } from "@/db/schema";
import { readUnsubscribeToken } from "@/lib/unsubscribe";
import { inRollback } from "@/test/db";
import { failingMailer, memoryMailer } from "@/test/mailer";
import { saveReminder } from "../reminders";
import { sendEmail, type SendInput } from "./send";
import { isSuppressed, unsubscribe, unsubscribeSecret } from "./suppressions";

const NOON = new Date("2026-10-07T12:00:00-04:00");

const content = {
  subject: "October 7 is in a week",
  preheader: "Claim it before someone else does.",
  kicker: "One week to go",
  title: "October 7",
  blocks: [{ kind: "p" as const, text: "Hi." }],
  reason: "Because.",
};

const input = (over: Partial<SendInput> = {}): SendInput => ({
  type: "reminder",
  to: "Sam@Example.com",
  dedupeKey: "reminder:1:2026",
  content,
  at: NOON,
  ...over,
});

describe("sendEmail", () => {
  it("sends once per dedupe key and logs it", async () => {
    await inRollback(async (tx) => {
      const mailer = memoryMailer();
      expect(await sendEmail(tx, mailer, input())).toBe("sent");
      expect(await sendEmail(tx, mailer, input())).toBe("duplicate");

      expect(mailer.sent).toHaveLength(1);
      expect(mailer.sent[0]).toMatchObject({ to: "sam@example.com", subject: "October 7 is in a week" });
      const log = await tx.select().from(emailLog);
      expect(log).toEqual([
        expect.objectContaining({ type: "reminder", to: "sam@example.com", dedupeKey: "reminder:1:2026", providerId: "<test-1@bday.lol>" }),
      ]);
    });
  });

  it("adds a signed unsubscribe link and one-click headers to emails people can switch off", async () => {
    await inRollback(async (tx) => {
      const mailer = memoryMailer();
      await sendEmail(tx, mailer, input({ category: "reminders" }));
      const email = mailer.sent[0]!;

      const link = email.text.match(/Unsubscribe: (\S+)/)?.[1];
      expect(link).toBeDefined();
      const token = new URL(link!).searchParams.get("t");
      expect(new URL(link!).pathname).toBe("/unsubscribe");
      expect(readUnsubscribeToken(token, unsubscribeSecret())).toEqual({ email: "sam@example.com", category: "reminders" });
      expect(email.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
      expect(email.headers?.["List-Unsubscribe"]).toMatch(/^<http.*\/api\/unsubscribe\?t=.+>$/);
    });
  });

  it("leaves receipts and alerts without an unsubscribe link", async () => {
    await inRollback(async (tx) => {
      const mailer = memoryMailer();
      await sendEmail(tx, mailer, input({ type: "boost_receipt", dedupeKey: "boost-receipt:1" }));
      expect(mailer.sent[0]!.text).not.toContain("Unsubscribe");
      expect(mailer.sent[0]!.headers).toBeUndefined();
    });
  });

  it("skips people who unsubscribed from that category only", async () => {
    await inRollback(async (tx) => {
      const mailer = memoryMailer();
      await unsubscribe(tx, "sam@example.com", "your_day", NOON);
      expect(await sendEmail(tx, mailer, input({ category: "your_day", dedupeKey: "your-day:1" }))).toBe("suppressed");
      expect(await sendEmail(tx, mailer, input({ category: "reminders" }))).toBe("sent");
      expect(mailer.sent).toHaveLength(1);
      expect(await tx.select().from(emailLog)).toHaveLength(1);
    });
  });

  it("frees the dedupe key when the send fails, so a retry can go out", async () => {
    await inRollback(async (tx) => {
      await expect(sendEmail(tx, failingMailer(), input())).rejects.toThrow("SMTP is down");
      expect(await tx.select().from(emailLog)).toEqual([]);

      const mailer = memoryMailer();
      expect(await sendEmail(tx, mailer, input())).toBe("sent");
    });
  });
});

describe("unsubscribe", () => {
  it("stops every reminder for that email, and signing up again turns them back on", async () => {
    await inRollback(async (tx) => {
      await saveReminder(tx, { month: 10, day: 7, email: "sam@example.com" });
      await saveReminder(tx, { month: 3, day: 1, email: "sam@example.com" });

      await unsubscribe(tx, "SAM@example.com", "reminders", NOON);
      await unsubscribe(tx, "sam@example.com", "reminders", NOON); // twice is fine
      expect(await isSuppressed(tx, "sam@example.com", "reminders")).toBe(true);
      const rows = await tx.select().from(reminders).where(eq(reminders.email, "sam@example.com"));
      expect(rows.every((r) => r.unsubscribedAt?.getTime() === NOON.getTime())).toBe(true);

      await saveReminder(tx, { month: 10, day: 7, email: "sam@example.com" });
      expect(await isSuppressed(tx, "sam@example.com", "reminders")).toBe(false);
      const after = await tx.select().from(reminders).where(eq(reminders.email, "sam@example.com"));
      expect(after.find((r) => r.month === 10)?.unsubscribedAt).toBeNull();
      // Only the date they signed up for again comes back.
      expect(after.find((r) => r.month === 3)?.unsubscribedAt).not.toBeNull();
    });
  });
});
