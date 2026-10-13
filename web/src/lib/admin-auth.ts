import { createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { RESET_CODE_DIGITS } from "./admin-auth-rules";

/**
 * The admin's sign-in (07 B14): one password, kept only as a hash in ADMIN_PASSWORD_HASH, and a
 * signed session cookie. No accounts: the client is the only admin.
 */

/** How long a sign-in lasts. */
export const ADMIN_SESSION_MS = 12 * 60 * 60 * 1000;
export const ADMIN_COOKIE = "admin_session";

/** Wrong passwords allowed from one address, and from everyone together, inside the window. */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_FAILS_PER_IP = 5;
export const LOGIN_MAX_FAILS_TOTAL = 30;

export {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  RESET_CODE_DIGITS,
  RESET_CODE_MAX_TRIES,
  RESET_CODE_MS,
  RESET_RESEND_MS,
  newPasswordError,
} from "./admin-auth-rules";

const KEY_BYTES = 64;

/**
 * "scrypt:<salt>:<hash>" for ADMIN_PASSWORD_HASH (`pnpm admin:password`). No "$" in it: env files treat
 * "$name" as another variable and would break the value.
 */
export function hashPassword(password: string, salt: Buffer = randomBytes(16)): string {
  const hash = scryptSync(password, salt, KEY_BYTES);
  return `scrypt:${salt.toString("base64url")}:${hash.toString("base64url")}`;
}

/** True when the password matches the stored hash. A missing or malformed hash never matches. */
export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!stored || !password) return false;
  const [scheme, salt, hash, extra] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash || extra !== undefined) return false;
  const expected = Buffer.from(hash, "base64url");
  if (expected.length !== KEY_BYTES) return false;
  const given = scryptSync(password, Buffer.from(salt, "base64url"), KEY_BYTES);
  return timingSafeEqual(expected, given);
}

/**
 * The key sessions are signed with: APP_SECRET tied to the current password's hash, so changing the
 * password signs everyone out everywhere (the screen that changed it gets a fresh cookie).
 */
export function sessionSecret(appSecret: string, passwordHash: string): string {
  return `${appSecret}:${passwordHash}`;
}

/** Two email addresses are the same mailbox: case and outer spaces don't count. */
export function sameEmail(a: string, b: string): boolean {
  const x = Buffer.from(a.trim().toLowerCase());
  const y = Buffer.from(b.trim().toLowerCase());
  return x.length === y.length && timingSafeEqual(x, y);
}

/** A fresh reset code, e.g. "048213": every value equally likely. */
export function newResetCode(): string {
  return String(randomInt(0, 10 ** RESET_CODE_DIGITS)).padStart(RESET_CODE_DIGITS, "0");
}

/** What is stored for a reset code: never the code itself. Spaces a person types between the digits don't count. */
export function resetCodeHash(code: string, secret: string): string {
  return createHmac("sha256", secret).update(`admin-reset:${code.replace(/\s+/g, "")}`).digest("base64url");
}

export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`admin-session:${payload}`).digest("base64url");
}

/** The cookie value: when it expires, signed with APP_SECRET so it can't be made up or extended. */
export function sessionToken(expiresAtMs: number, secret: string): string {
  const payload = String(Math.floor(expiresAtMs));
  return `${payload}.${sign(payload, secret)}`;
}

/** True for a cookie this app signed that hasn't expired. */
export function isValidSession(token: unknown, secret: string | undefined, nowMs: number): boolean {
  if (typeof token !== "string" || token.length > 200 || !secret) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined || !/^\d{1,16}$/.test(payload)) return false;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  return Number(payload) > nowMs;
}

/** May this address try a password now? `fails` are wrong passwords inside LOGIN_WINDOW_MS. */
export function loginAllowed(fails: { fromThisIp: number; total: number }): boolean {
  return fails.fromThisIp < LOGIN_MAX_FAILS_PER_IP && fails.total < LOGIN_MAX_FAILS_TOTAL;
}
