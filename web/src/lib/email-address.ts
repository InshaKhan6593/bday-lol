/**
 * One plain mailbox, nothing a mail library could read as a list or a display name
 * (no commas, semicolons, angle brackets, quotes, brackets or spaces). The length is
 * checked before the pattern, and no part of the pattern can match the same text two ways.
 */
const MAILBOX = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

export const EMAIL_MAX_LENGTH = 254;

export function isEmailAddress(value: string): boolean {
  return value.length <= EMAIL_MAX_LENGTH && MAILBOX.test(value);
}
