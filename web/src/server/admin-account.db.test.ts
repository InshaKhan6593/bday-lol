import { afterEach, describe, expect, it, vi } from "vitest";
import { adminLogins } from "@/db/schema";
import {
  LOGIN_MAX_FAILS_PER_IP,
  RESET_CODE_MAX_TRIES,
  RESET_CODE_MS,
  RESET_RESEND_MS,
  hashPassword,
  isValidSession,
  newPasswordError,
  newResetCode,
  resetCodeHash,
  sameEmail,
  sessionSecret,
  sessionToken,
  verifyPassword,
} from "@/lib/admin-auth";
import { inRollback } from "@/test/db";
import { failingMailer, memoryMailer } from "@/test/mailer";
import { adminEmail, checkPassword, checkSignIn, passwordHash, resetWithCode, saveEmail, savePassword, sendResetCode } from "./admin-session";

const NOON = new Date("2026-10-12T12:00:00-04:00");
const IP = "1.1.1.1";
const OLD = "the old password";
const NEW = "a brand new password";
const ADMIN = "owner@example.com";

const setUp = () => {
  vi.stubEnv("ADMIN_PASSWORD_HASH", hashPassword(OLD));
  vi.stubEnv("ADMIN_EMAIL", "");
  vi.stubEnv("ADMIN_ALERT_EMAIL", ADMIN);
};

/** The 6 digits in the email's subject ("048 213 is your…"). */
const codeIn = (subject: string) => subject.replace(/\D/g, "").slice(0, 6);

afterEach(() => vi.unstubAllEnvs());

describe("password rules", () => {
  it("asks for 12 characters, typed the same twice, and not the current one", () => {
    expect(newPasswordError("short", "short", OLD)).toMatch(/at least 12/);
    expect(newPasswordError(NEW, `${NEW}!`, OLD)).toMatch(/don’t match/);
    expect(newPasswordError(OLD, OLD, OLD)).toMatch(/current password/);
    expect(newPasswordError("x".repeat(201), "x".repeat(201), OLD)).toMatch(/too long/);
    expect(newPasswordError(NEW, NEW, OLD)).toBeNull();
  });

  it("a session signed for one password stops working when the password changes", () => {
    const expires = NOON.getTime() + 60_000;
    const token = sessionToken(expires, sessionSecret("app-secret", hashPassword(OLD)));
    expect(isValidSession(token, sessionSecret("app-secret", hashPassword(NEW)), NOON.getTime())).toBe(false);
  });

  it("reset codes are 6 digits, stored only as a hash, and spaces typed between them don't count", () => {
    for (let i = 0; i < 50; i++) expect(newResetCode()).toMatch(/^\d{6}$/);
    expect(resetCodeHash("048213", "s")).toBe(resetCodeHash("048 213", "s"));
    expect(resetCodeHash("048213", "s")).not.toBe(resetCodeHash("048214", "s"));
    expect(resetCodeHash("048213", "s")).not.toContain("048213");
  });

  it("compares emails without case or outer spaces", () => {
    expect(sameEmail(" Owner@Example.com ", ADMIN)).toBe(true);
    expect(sameEmail("owner@example.co", ADMIN)).toBe(false);
  });
});

describe("admin: email and password sign-in", () => {
  it("needs both to be right, and never says which one was wrong", async () => {
    setUp();
    await inRollback(async (tx) => {
      const wrong = { ok: false, error: "That email or password isn’t right." };
      expect(await checkSignIn(tx, "someone@else.com", OLD, IP, NOON)).toEqual(wrong);
      expect(await checkSignIn(tx, ADMIN, "not the password", IP, NOON)).toEqual(wrong);
      expect(await checkSignIn(tx, " OWNER@example.com", OLD, IP, NOON)).toEqual({ ok: true });
      expect((await tx.select().from(adminLogins)).map((r) => r.ok)).toEqual([false, false, true]);
    });
  });

  it("a wrong email counts toward the same limit as a wrong password", async () => {
    setUp();
    await inRollback(async (tx) => {
      for (let i = 0; i < LOGIN_MAX_FAILS_PER_IP; i++) await checkSignIn(tx, "guess@example.com", OLD, IP, NOON);
      expect(await checkSignIn(tx, ADMIN, OLD, IP, NOON)).toMatchObject({ ok: false, error: expect.stringMatching(/Too many/) });
    });
  });

  it("uses ADMIN_EMAIL before the alerts address, and the password alone when no email is set up", async () => {
    setUp();
    await inRollback(async (tx) => {
      vi.stubEnv("ADMIN_EMAIL", "login@example.com");
      expect(await adminEmail(tx)).toBe("login@example.com");
      vi.stubEnv("ADMIN_EMAIL", "");
      vi.stubEnv("ADMIN_ALERT_EMAIL", "");
      expect(await adminEmail(tx)).toBeUndefined();
      expect(await checkSignIn(tx, "anything@example.com", OLD, IP, NOON)).toEqual({ ok: true });
    });
  });
});

describe("admin: changing the password and the email", () => {
  it("saves a new password: the old one stops working and the new one signs in", async () => {
    setUp();
    await inRollback(async (tx) => {
      expect(await savePassword(tx, { current: OLD, next: NEW, confirm: NEW }, IP, NOON)).toEqual({ ok: true });
      expect(verifyPassword(NEW, await passwordHash(tx))).toBe(true);
      expect(await checkPassword(tx, OLD, IP, NOON)).toMatchObject({ ok: false });
      expect(await checkPassword(tx, NEW, IP, NOON)).toEqual({ ok: true });
    });
  });

  it("refuses without the current password, and a wrong one counts as a wrong sign-in", async () => {
    setUp();
    await inRollback(async (tx) => {
      expect(await savePassword(tx, { current: "a wrong guess", next: NEW, confirm: NEW }, IP, NOON)).toEqual({
        ok: false,
        field: "current",
        error: "Your current password isn’t right.",
      });
      expect(verifyPassword(OLD, await passwordHash(tx))).toBe(true);
      expect((await tx.select().from(adminLogins)).map((r) => r.ok)).toEqual([false]);
    });
  });

  it("checks the new password before anything is tried or saved", async () => {
    setUp();
    await inRollback(async (tx) => {
      expect(await savePassword(tx, { current: OLD, next: "short", confirm: "short" }, IP, NOON)).toMatchObject({ ok: false, field: "next" });
      expect(await tx.select().from(adminLogins)).toEqual([]);
    });
  });

  it("changes the sign-in email with the current password", async () => {
    setUp();
    await inRollback(async (tx) => {
      expect(await saveEmail(tx, { current: OLD, email: "not an email" }, IP, NOON)).toMatchObject({ ok: false, field: "email" });
      expect(await saveEmail(tx, { current: "wrong", email: "new@example.com" }, IP, NOON)).toMatchObject({ ok: false, field: "current" });
      expect(await saveEmail(tx, { current: OLD, email: " New@Example.com " }, IP, NOON)).toEqual({ ok: true, email: "new@example.com" });
      expect(await adminEmail(tx)).toBe("new@example.com");
      expect(await checkSignIn(tx, ADMIN, OLD, IP, NOON)).toMatchObject({ ok: false });
      expect(await checkSignIn(tx, "new@example.com", OLD, IP, NOON)).toEqual({ ok: true });
    });
  });
});

describe("admin: forgot password", () => {
  it("emails a code to the admin and sets a new password with it, once", async () => {
    setUp();
    await inRollback(async (tx) => {
      const mailer = memoryMailer();
      expect(await sendResetCode(tx, mailer, " Owner@example.com", NOON)).toEqual({ sent: true });
      const [email] = mailer.to(ADMIN);
      const code = codeIn(email!.subject);
      expect(code).toMatch(/^\d{6}$/);
      expect(email!.text).toContain("expires in 15 minutes");

      expect(await resetWithCode(tx, { email: ADMIN, code, next: NEW, confirm: NEW }, IP, NOON)).toEqual({ ok: true });
      expect(await checkSignIn(tx, ADMIN, NEW, IP, NOON)).toEqual({ ok: true });
      expect(await checkSignIn(tx, ADMIN, OLD, IP, NOON)).toMatchObject({ ok: false });
      // The code is used up.
      expect(await resetWithCode(tx, { email: ADMIN, code, next: "yet another password", confirm: "yet another password" }, IP, NOON)).toMatchObject({ ok: false, field: "code" });
    });
  });

  it("sends nothing for any other email, and nothing twice inside a minute", async () => {
    setUp();
    await inRollback(async (tx) => {
      const mailer = memoryMailer();
      expect(await sendResetCode(tx, mailer, "stranger@example.com", NOON)).toEqual({ sent: false });
      expect(await sendResetCode(tx, mailer, ADMIN, NOON)).toEqual({ sent: true });
      expect(await sendResetCode(tx, mailer, ADMIN, new Date(NOON.getTime() + RESET_RESEND_MS - 1))).toEqual({ sent: false });
      expect(await sendResetCode(tx, mailer, ADMIN, new Date(NOON.getTime() + RESET_RESEND_MS))).toEqual({ sent: true });
      expect(mailer.sent).toHaveLength(2);
    });
  });

  it("a newer code replaces the older one", async () => {
    setUp();
    await inRollback(async (tx) => {
      const mailer = memoryMailer();
      await sendResetCode(tx, mailer, ADMIN, NOON);
      const later = new Date(NOON.getTime() + RESET_RESEND_MS);
      await sendResetCode(tx, mailer, ADMIN, later);
      const [first, second] = mailer.sent.map((e) => codeIn(e.subject));
      if (first !== second) {
        expect(await resetWithCode(tx, { email: ADMIN, code: first!, next: NEW, confirm: NEW }, IP, later)).toMatchObject({ ok: false });
      }
      expect(await resetWithCode(tx, { email: ADMIN, code: second!, next: NEW, confirm: NEW }, "2.2.2.2", later)).toEqual({ ok: true });
    });
  });

  it("refuses an expired code, a code with the wrong email, and a weak new password", async () => {
    setUp();
    await inRollback(async (tx) => {
      const mailer = memoryMailer();
      await sendResetCode(tx, mailer, ADMIN, NOON);
      const code = codeIn(mailer.sent[0]!.subject);
      expect(await resetWithCode(tx, { email: ADMIN, code, next: "short", confirm: "short" }, IP, NOON)).toMatchObject({ ok: false, field: "next" });
      expect(await resetWithCode(tx, { email: "stranger@example.com", code, next: NEW, confirm: NEW }, IP, NOON)).toMatchObject({ ok: false, field: "code" });
      const late = new Date(NOON.getTime() + RESET_CODE_MS);
      expect(await resetWithCode(tx, { email: ADMIN, code, next: NEW, confirm: NEW }, "2.2.2.2", late)).toMatchObject({ ok: false, field: "code" });
      expect(verifyPassword(OLD, await passwordHash(tx))).toBe(true);
    });
  });

  it("a code stops working after 5 wrong guesses, even when the right one follows", async () => {
    setUp();
    await inRollback(async (tx) => {
      const mailer = memoryMailer();
      await sendResetCode(tx, mailer, ADMIN, NOON);
      const code = codeIn(mailer.sent[0]!.subject);
      const wrong = code === "000000" ? "111111" : "000000";
      // Each guess from a different address, so only the code's own limit is in play.
      for (let i = 0; i < RESET_CODE_MAX_TRIES; i++) {
        expect(await resetWithCode(tx, { email: ADMIN, code: wrong, next: NEW, confirm: NEW }, `9.9.9.${i}`, NOON)).toMatchObject({ ok: false });
      }
      expect(await resetWithCode(tx, { email: ADMIN, code, next: NEW, confirm: NEW }, "8.8.8.8", NOON)).toMatchObject({ ok: false, field: "code" });
      expect(verifyPassword(OLD, await passwordHash(tx))).toBe(true);
    });
  });

  it("a failed send leaves no code behind, so the next request can go out at once", async () => {
    setUp();
    await inRollback(async (tx) => {
      await expect(sendResetCode(tx, failingMailer(), ADMIN, NOON)).rejects.toThrow("SMTP is down");
      const mailer = memoryMailer();
      expect(await sendResetCode(tx, mailer, ADMIN, NOON)).toEqual({ sent: true });
    });
  });
});
