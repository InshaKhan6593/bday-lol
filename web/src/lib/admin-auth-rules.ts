/**
 * The rules for a new admin password, apart from lib/admin-auth.ts so the browser can show them
 * (that file hashes with Node's crypto and never leaves the server).
 */

/** Long enough to resist guessing; short enough that hashing it stays cheap. */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 200;

/** A reset code: how many digits, how long it lasts, how many wrong tries it survives, how soon another can be sent. */
export const RESET_CODE_DIGITS = 6;
export const RESET_CODE_MS = 15 * 60 * 1000;
export const RESET_CODE_MAX_TRIES = 5;
export const RESET_RESEND_MS = 60 * 1000;

/** What stops a new password from being saved, or null. */
export function newPasswordError(next: string, confirm: string, current: string): string | null {
  if (next.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (next.length > PASSWORD_MAX_LENGTH) return "That password is too long.";
  if (next !== confirm) return "The two new passwords don’t match.";
  if (next === current) return "That’s your current password. Pick a new one.";
  return null;
}
