import { and, eq, isNull } from "drizzle-orm";
import type { Executor } from "@/db";
import { emailSuppressions, reminders } from "@/db/schema";
import type { EmailCategory } from "@/lib/unsubscribe";

const DEV_SECRET = "change-me-to-a-long-random-string";

/** The key that signs unsubscribe links. Production refuses to run with the placeholder. */
export function unsubscribeSecret(): string {
  const secret = process.env.APP_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret === DEV_SECRET || secret.length < 32)) {
    throw new Error("Set APP_SECRET to a long random string (32+ characters).");
  }
  return secret || DEV_SECRET;
}

export async function isSuppressed(db: Executor, email: string, category: EmailCategory): Promise<boolean> {
  const [row] = await db
    .select({ email: emailSuppressions.email })
    .from(emailSuppressions)
    .where(and(eq(emailSuppressions.email, email.toLowerCase()), eq(emailSuppressions.category, category)))
    .limit(1);
  return Boolean(row);
}

/** Switches a category off for an email. Reminders also stop on every date they signed up for. */
export async function unsubscribe(db: Executor, email: string, category: EmailCategory, instant: Date): Promise<void> {
  const address = email.toLowerCase();
  await db
    .insert(emailSuppressions)
    .values({ email: address, category, createdAt: instant })
    .onConflictDoNothing({ target: [emailSuppressions.email, emailSuppressions.category] });
  if (category === "reminders") {
    await db
      .update(reminders)
      .set({ unsubscribedAt: instant })
      .where(and(eq(reminders.email, address), isNull(reminders.unsubscribedAt)));
  }
}

/** Signing up for a reminder again turns reminders back on for that email. */
export async function resubscribeReminders(db: Executor, email: string): Promise<void> {
  await db
    .delete(emailSuppressions)
    .where(and(eq(emailSuppressions.email, email.toLowerCase()), eq(emailSuppressions.category, "reminders")));
}
