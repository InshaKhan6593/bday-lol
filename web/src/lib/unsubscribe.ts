import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Unsubscribe links (spec §8: reminder, your-day and re-claim emails, plus the
 * boost digest). There are no accounts, so the link itself is the proof: it
 * carries the email and the category, signed with APP_SECRET so nobody can
 * unsubscribe someone else by editing the URL.
 */

/** The email kinds people can switch off. Matches the email_category enum. */
export const EMAIL_CATEGORIES = ["reminders", "your_day", "boost_digest"] as const;
export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

/** How the unsubscribe page names each category: "You won't get birthday reminders any more." */
export const CATEGORY_LABELS: Record<EmailCategory, string> = {
  reminders: "birthday reminders",
  your_day: "“Your day is here” emails",
  boost_digest: "“You got boosted” emails",
};

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function unsubscribeToken(email: string, category: EmailCategory, secret: string): string {
  const payload = Buffer.from(JSON.stringify([email.trim().toLowerCase(), category])).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/** The email and category in a valid token, or null for a missing, edited or foreign one. */
export function readUnsubscribeToken(
  token: unknown,
  secret: string,
): { email: string; category: EmailCategory } | null {
  if (typeof token !== "string" || token.length > 1_000) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const value: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!Array.isArray(value) || value.length !== 2) return null;
    const [email, category] = value as [unknown, unknown];
    if (typeof email !== "string" || !email.includes("@")) return null;
    if (!EMAIL_CATEGORIES.includes(category as EmailCategory)) return null;
    return { email, category: category as EmailCategory };
  } catch {
    return null;
  }
}
