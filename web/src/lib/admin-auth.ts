import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

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
