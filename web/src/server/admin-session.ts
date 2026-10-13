import { and, eq, gt, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db, type Executor } from "@/db";
import { adminLogins, adminSettings } from "@/db/schema";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MS,
  LOGIN_WINDOW_MS,
  RESET_CODE_MAX_TRIES,
  RESET_CODE_MS,
  RESET_RESEND_MS,
  hashPassword,
  isValidSession,
  loginAllowed,
  newPasswordError,
  newResetCode,
  resetCodeHash,
  sameEmail,
  sameHash,
  sessionSecret,
  sessionToken,
  verifyPassword,
} from "@/lib/admin-auth";
import { now } from "@/lib/clock";
import { isEmailAddress } from "@/lib/email-address";
import { renderEmail } from "@/lib/email-render";
import { adminResetEmail } from "@/lib/email-templates";
import { siteOrigin } from "@/lib/routes";
import { getMailer, type Mailer } from "./email/mailer";
import { routes } from "@/lib/routes";
import { unsubscribeSecret } from "./email/suppressions";

/**
 * The admin's sign-in (07 B14): an email and a password, a signed httpOnly cookie, and a limit on
 * wrong tries. The password's hash is the one saved from the Account screen, or ADMIN_PASSWORD_HASH
 * until the admin has changed it; the email is the saved one, or ADMIN_EMAIL, or the address the
 * admin alerts go to. A forgotten password is replaced with a code sent to that email. Every admin
 * page and every admin action calls requireAdmin() itself: nothing is protected by being hard to find.
 */

const PASSWORD_KEY = "password_hash";
const EMAIL_KEY = "email";
const RESET_KEY = "reset";

async function setting(db: Executor, key: string): Promise<string | undefined> {
  const [row] = await db.select({ value: adminSettings.value }).from(adminSettings).where(eq(adminSettings.key, key)).limit(1);
  return row?.value;
}

async function saveSetting(db: Executor, key: string, value: string, instant: Date): Promise<void> {
  await db
    .insert(adminSettings)
    .values({ key, value, updatedAt: instant })
    .onConflictDoUpdate({ target: adminSettings.key, set: { value, updatedAt: instant } });
}

/** The email the admin signs in with, or undefined when none has been set up anywhere. */
export async function adminEmail(db: Executor): Promise<string | undefined> {
  const email = (await setting(db, EMAIL_KEY)) || process.env.ADMIN_EMAIL || process.env.ADMIN_ALERT_EMAIL;
  return email?.trim().toLowerCase() || undefined;
}

/** The current password's hash: the saved one, else the one the site was set up with. */
export async function passwordHash(db: Executor): Promise<string | undefined> {
  return (await setting(db, PASSWORD_KEY)) ?? (process.env.ADMIN_PASSWORD_HASH || undefined);
}

/** Read once while a page is drawn: the layout and the page both check the sign-in. */
const hashForThisRequest = cache(() => passwordHash(db));

/** Is the visitor signed in as the admin? */
export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const hash = await hashForThisRequest();
  return Boolean(hash) && isValidSession(token, sessionSecret(unsubscribeSecret(), hash!), now().getTime());
}

/** For pages: sends anyone who isn't signed in to the sign-in page. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect(routes.admin.login);
}

/** Wrong passwords inside the window, from this address and from everyone. */
export async function recentFails(db: Executor, ip: string, instant: Date): Promise<{ fromThisIp: number; total: number }> {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      fromThisIp: sql<number>`(count(*) filter (where ${adminLogins.ip} = ${ip}))::int`,
    })
    .from(adminLogins)
    .where(and(eq(adminLogins.ok, false), gt(adminLogins.at, new Date(instant.getTime() - LOGIN_WINDOW_MS))));
  return { fromThisIp: row?.fromThisIp ?? 0, total: row?.total ?? 0 };
}

/** Any fixed number: the advisory lock that puts sign-in tries in single file. */
const SIGN_IN_LOCK = 760_612_001;

export type SignInResult = { ok: true } | { ok: false; error: string };

/**
 * One sign-in try, recorded. One try at a time, across every server instance: tries sent together
 * would otherwise all read the same count before any of them had recorded a failure, and each get
 * a guess past the limit.
 */
async function attempt(db: Executor, ip: string, instant: Date, wrong: string, check: (tx: Executor) => Promise<boolean>): Promise<SignInResult> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${SIGN_IN_LOCK})`);
    if (!loginAllowed(await recentFails(tx, ip, instant))) {
      return { ok: false, error: "Too many wrong tries. Wait 15 minutes and try again." };
    }
    const ok = await check(tx);
    await tx.insert(adminLogins).values({ ip, ok, at: instant });
    return ok ? { ok: true } : { ok: false, error: wrong };
  });
}

const NOT_SET_UP: SignInResult = { ok: false, error: "The admin isn’t set up yet: ADMIN_PASSWORD_HASH is missing." };

/** Checks a password try and records it. Kept apart from the cookie so it can be tested. */
export async function checkPassword(db: Executor, password: string, ip: string, instant: Date): Promise<SignInResult> {
  const hash = await passwordHash(db);
  if (!hash) return NOT_SET_UP;
  return attempt(db, ip, instant, "That password isn’t right.", async () => verifyPassword(password, hash));
}

/**
 * Checks an email and password together and records the try. The answer never says which of the
 * two was wrong. With no admin email set up anywhere, the password alone decides, so nobody is
 * locked out of a site that was set up before emails were asked for.
 */
export async function checkSignIn(db: Executor, email: string, password: string, ip: string, instant: Date): Promise<SignInResult> {
  const hash = await passwordHash(db);
  if (!hash) return NOT_SET_UP;
  const expected = await adminEmail(db);
  return attempt(db, ip, instant, "That email or password isn’t right.", async () => {
    // Both are always checked, so a wrong email takes as long as a wrong password.
    const passwordOk = verifyPassword(password, hash);
    const emailOk = expected ? sameEmail(email, expected) : true;
    return passwordOk && emailOk;
  });
}

/** The caller's address, as the host reports it. */
async function callerIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Gives this browser a session signed for the password that is current now. */
async function startSession(instant: Date): Promise<void> {
  const hash = await passwordHash(db);
  if (!hash) return;
  const expires = instant.getTime() + ADMIN_SESSION_MS;
  (await cookies()).set(ADMIN_COOKIE, sessionToken(expires, sessionSecret(unsubscribeSecret(), hash)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    expires: new Date(expires),
  });
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const instant = now();
  const result = await checkSignIn(db, email, password, await callerIp(), instant);
  if (!result.ok) return result;
  await startSession(instant);
  return { ok: true };
}

export type PasswordChange = { current: string; next: string; confirm: string };
export type PasswordChangeResult = { ok: true } | { ok: false; field: "current" | "next"; error: string };

/**
 * Saves a new password. The current one is asked for again and checked like a sign-in (a wrong one
 * counts toward the same limit), so a browser left open can't be used to take the admin over.
 * Kept apart from the cookie so it can be tested.
 */
export async function savePassword(db: Executor, change: PasswordChange, ip: string, instant: Date): Promise<PasswordChangeResult> {
  const problem = newPasswordError(change.next, change.confirm, change.current);
  if (problem) return { ok: false, field: "next", error: problem };
  const checked = await checkPassword(db, change.current, ip, instant);
  if (!checked.ok) return { ok: false, field: "current", error: checked.error.replace("That password", "Your current password") };
  await saveSetting(db, PASSWORD_KEY, hashPassword(change.next), instant);
  return { ok: true };
}

export type EmailChangeResult = { ok: true; email: string } | { ok: false; field: "current" | "email"; error: string };

/** Saves a new sign-in email. The current password is asked for again, like a password change. */
export async function saveEmail(db: Executor, change: { current: string; email: string }, ip: string, instant: Date): Promise<EmailChangeResult> {
  const email = change.email.trim().toLowerCase();
  if (!isEmailAddress(email)) return { ok: false, field: "email", error: "Enter an email address." };
  const checked = await checkPassword(db, change.current, ip, instant);
  if (!checked.ok) return { ok: false, field: "current", error: checked.error.replace("That password", "Your current password") };
  await saveSetting(db, EMAIL_KEY, email, instant);
  return { ok: true, email };
}

export async function changeEmail(change: { current: string; email: string }): Promise<EmailChangeResult> {
  return saveEmail(db, change, await callerIp(), now());
}

// ---------------------------------------------------------------------------
// Forgot password: a code sent to the admin's email
// ---------------------------------------------------------------------------

type StoredReset = { hash: string; expiresAt: number; tries: number; sentAt: number };

async function storedReset(db: Executor): Promise<StoredReset | null> {
  const raw = await setting(db, RESET_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredReset;
  } catch {
    return null;
  }
}

/**
 * Sends a reset code to the admin's email, if `email` is that address. The caller gets the same
 * answer either way, so the form can't be used to find out which address is the admin's. A new code
 * replaces the old one, and at most one is sent a minute.
 */
export async function sendResetCode(db: Executor, mailer: Mailer, email: string, instant: Date): Promise<{ sent: boolean }> {
  const expected = await adminEmail(db);
  if (!expected || !sameEmail(email, expected) || !(await passwordHash(db))) return { sent: false };
  const last = await storedReset(db);
  if (last && instant.getTime() - last.sentAt < RESET_RESEND_MS) return { sent: false };

  const code = newResetCode();
  const reset: StoredReset = {
    hash: resetCodeHash(code, unsubscribeSecret()),
    expiresAt: instant.getTime() + RESET_CODE_MS,
    tries: 0,
    sentAt: instant.getTime(),
  };
  await saveSetting(db, RESET_KEY, JSON.stringify(reset), instant);
  const rendered = renderEmail(adminResetEmail({ code, minutes: RESET_CODE_MS / 60_000 }), { origin: siteOrigin() });
  try {
    await mailer.send({ to: expected, subject: rendered.subject, html: rendered.html, text: rendered.text });
  } catch (error) {
    // A code nobody received must not block the next request for a minute.
    await db.delete(adminSettings).where(eq(adminSettings.key, RESET_KEY));
    throw error;
  }
  return { sent: true };
}

export type ResetInput = { email: string; code: string; next: string; confirm: string };
export type ResetResult = { ok: true } | { ok: false; field: "code" | "next"; error: string };

/**
 * Sets a new password with an emailed code. A code works once, for 15 minutes, and stops working
 * after 5 wrong tries; every wrong try also counts toward the sign-in limit. Kept apart from the
 * cookie so it can be tested.
 */
export async function resetWithCode(db: Executor, input: ResetInput, ip: string, instant: Date): Promise<ResetResult> {
  const problem = newPasswordError(input.next, input.confirm, "");
  if (problem) return { ok: false, field: "next", error: problem };
  const expected = await adminEmail(db);
  const wrong = "That code isn’t right, or it has expired. Ask for a new one.";
  const tried = await attempt(db, ip, instant, wrong, async (tx) => {
    const reset = await storedReset(tx);
    if (!reset) return false;
    const live = reset.expiresAt > instant.getTime() && reset.tries < RESET_CODE_MAX_TRIES;
    const match = sameHash(resetCodeHash(input.code, unsubscribeSecret()), reset.hash) && Boolean(expected) && sameEmail(input.email, expected!);
    if (live && match) {
      await saveSetting(tx, PASSWORD_KEY, hashPassword(input.next), instant);
      await tx.delete(adminSettings).where(eq(adminSettings.key, RESET_KEY));
      return true;
    }
    await saveSetting(tx, RESET_KEY, JSON.stringify({ ...reset, tries: reset.tries + 1 }), instant);
    return false;
  });
  return tried.ok ? { ok: true } : { ok: false, field: "code", error: tried.error };
}

/** The "Forgot password?" form's first step. Never says whether the email was the admin's. */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await sendResetCode(db, getMailer(), email, now());
  } catch (error) {
    console.error("[admin] reset email failed", error);
  }
}

/** The second step: the code and a new password. Signs this browser in when it works. */
export async function resetPassword(input: ResetInput): Promise<ResetResult> {
  const instant = now();
  const result = await resetWithCode(db, input, await callerIp(), instant);
  if (result.ok) await startSession(instant);
  return result;
}

/** Changes the password, then signs this browser in again: every other session stops working. */
export async function changePassword(change: PasswordChange): Promise<PasswordChangeResult> {
  const instant = now();
  const result = await savePassword(db, change, await callerIp(), instant);
  if (result.ok) await startSession(instant);
  return result;
}

export async function signOut(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, "", { httpOnly: true, path: "/admin", maxAge: 0 });
}
