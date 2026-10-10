import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { outbidAlerts, reminders } from "@/db/schema";
import { receiptNumber } from "@/lib/email-templates";
import { addBirthdayType, inRollback } from "@/test/db";
import { failingMailer, memoryMailer } from "@/test/mailer";
import { paidBoost, paidClaim } from "@/test/money";
import { ensureBoard } from "../boards";
import { emailsAfterStripeEvent, sendPaymentEmails } from "./payment-emails";

const oct7 = { month: 10, day: 7 };
const oct12 = { month: 10, day: 12 };
const at = (hhmm: string) => new Date(`2026-10-07T${hhmm}:00-04:00`);

beforeEach(() => {
  vi.stubEnv("ADMIN_ALERT_EMAIL", "admin@example.com");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://mybday.lol");
});
afterEach(() => vi.unstubAllEnvs());

describe("payment emails", () => {
  it("confirms a claim to the claimer and copies the admin, once", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await ensureBoard(tx, type, oct7, 2026);
      const sam = await paidClaim(tx, board.id, {
        md: oct7,
        name: "Sam Rivera",
        usd: 241,
        email: "sam@example.com",
        at: at("14:40"),
        photoUrl: "/uploads/sam.jpg",
      });
      const mailer = memoryMailer();

      const run = await sendPaymentEmails(tx, mailer, sam.sessionId, at("14:40"));
      expect(run).toMatchObject({ sent: 2, failed: 0 });
      const [confirmation] = mailer.to("sam@example.com");
      expect(confirmation?.subject).toBe("October 7 is yours. For now.");
      expect(confirmation?.text).toContain("You're on the mybday.lol homepage until midnight ET");
      expect(confirmation?.text).toMatch(/Share your link: https:\/\/mybday\.lol\/october-7\/sam-rivera$/m);
      // A short receipt number from our payment id (Stripe holds the full id as metadata.paymentId).
      expect(confirmation?.text).toContain(`RECEIPT No. ${receiptNumber(sam.paymentId)}`);
      expect(confirmation?.text).toContain("Total paid: $241");
      // The photo is absolute, so it loads in the inbox.
      expect(confirmation?.html).toContain('src="https://mybday.lol/uploads/sam.jpg"');

      const [admin] = mailer.to("admin@example.com");
      expect(admin?.subject).toBe("New claim: Sam Rivera, Oct 7, $241");
      expect(admin?.text).toContain("Email: sam@example.com");

      // Stripe retries the webhook: nothing goes out twice.
      expect(await sendPaymentEmails(tx, mailer, sam.sessionId, at("14:41"))).toMatchObject({ sent: 0, skipped: 2 });
      expect(mailer.sent).toHaveLength(2);
    });
  });

  it("tells a claimer who was passed while paying their real rank", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await ensureBoard(tx, type, oct12, 2026);
      await paidClaim(tx, board.id, { md: oct12, name: "Tyler Brooks", usd: 240, email: "tyler@example.com", at: at("09:00") });
      const sam = await paidClaim(tx, board.id, { md: oct12, name: "Sam Rivera", usd: 150, email: "sam@example.com", at: at("10:00") });
      const mailer = memoryMailer();

      await sendPaymentEmails(tx, mailer, sam.sessionId, at("10:00"));
      const [confirmation] = mailer.to("sam@example.com");
      expect(confirmation?.subject).toBe("You're #2 on October 12");
      expect(confirmation?.text).toContain("$91 more takes #1.");
    });
  });

  it("sends a boost receipt to the email Stripe collected", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await ensureBoard(tx, type, oct7, 2026);
      const tyler = await paidClaim(tx, board.id, { md: oct7, name: "Tyler Brooks", usd: 225, email: "tyler@example.com", at: at("09:00") });
      const boost = await paidBoost(tx, tyler.entryId, { usd: 16, email: "Fan@Example.com", at: at("11:00"), alert: true });
      const mailer = memoryMailer();

      expect(await sendPaymentEmails(tx, mailer, boost.sessionId, at("11:00"))).toMatchObject({ sent: 1 });
      const [receipt] = mailer.to("fan@example.com");
      expect(receipt?.subject).toBe("Your $16 boost for Tyler is in");
      expect(receipt?.text).toContain("Tyler is #1 on October 7 with $241.");
      expect(receipt?.text).toContain("We'll email you if Tyler gets passed.");
      expect(mailer.to("admin@example.com")).toEqual([]);
    });
  });

  it("adds every claimer to next year's reminder for their date (yearly re-claim)", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await ensureBoard(tx, type, oct7, 2026);
      await paidClaim(tx, board.id, { md: oct7, name: "Sam Rivera", usd: 5, email: "Sam@Example.com", at: at("09:00") });
      expect(await tx.select().from(reminders)).toEqual([
        expect.objectContaining({ email: "sam@example.com", month: 10, day: 7, source: "claim", unsubscribedAt: null }),
      ]);
    });
  });

  it("sends nothing for a payment that isn't paid", async () => {
    await inRollback(async (tx) => {
      await addBirthdayType(tx);
      const mailer = memoryMailer();
      expect(await sendPaymentEmails(tx, mailer, "cs_unknown", at("09:00"))).toMatchObject({ sent: 0, skipped: 0 });
      expect(mailer.sent).toEqual([]);
    });
  });

  it("reports a failed send so the webhook asks Stripe to retry", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await ensureBoard(tx, type, oct7, 2026);
      const sam = await paidClaim(tx, board.id, { md: oct7, name: "Sam Rivera", usd: 5, email: "sam@example.com", at: at("09:00") });

      const run = await sendPaymentEmails(tx, failingMailer(), sam.sessionId, at("09:00"));
      expect(run).toMatchObject({ sent: 0, failed: 2 });
      expect(run.errors[0]).toContain("SMTP is down");

      const mailer = memoryMailer();
      expect(await sendPaymentEmails(tx, mailer, sam.sessionId, at("09:01"))).toMatchObject({ sent: 2 });
    });
  });

  it("announces losing #1 straight from the webhook", async () => {
    await inRollback(async (tx) => {
      const type = await addBirthdayType(tx);
      const board = await ensureBoard(tx, type, oct7, 2026);
      const jess = await paidClaim(tx, board.id, { md: oct7, name: "Jess Moreno", usd: 240, email: "jess@example.com", at: at("09:00") });
      const tyler = await paidClaim(tx, board.id, { md: oct7, name: "Tyler Brooks", usd: 241, email: "tyler@example.com", at: at("14:40") });
      const mailer = memoryMailer();

      const out = await emailsAfterStripeEvent(
        tx,
        mailer,
        { handled: true, action: "fulfilled", sessionId: tyler.sessionId, result: tyler.result },
        at("14:40"),
      );
      expect(out?.payment.sent).toBe(2);
      expect(out?.alerts.sent).toBe(1);
      const [alert] = mailer.to("jess@example.com");
      expect(alert?.subject).toBe("You got passed on October 7");
      expect(alert?.text).toContain("Boost $2: https://mybday.lol/october-7?boost=");
      const [row] = await tx.select().from(outbidAlerts).where(eq(outbidAlerts.entryId, jess.entryId));
      expect(row?.sentAt).toEqual(at("14:40"));
    });
  });

  it("ignores events that didn't credit a payment", async () => {
    await inRollback(async (tx) => {
      const mailer = memoryMailer();
      expect(await emailsAfterStripeEvent(tx, mailer, { handled: true, action: "expired", changed: true }, at("09:00"))).toBeNull();
      expect(await emailsAfterStripeEvent(tx, mailer, { handled: false, reason: "x" }, at("09:00"))).toBeNull();
    });
  });
});
