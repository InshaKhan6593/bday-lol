import { eq } from "drizzle-orm";
import type { Executor } from "@/db";
import { emailLog } from "@/db/schema";
import { renderEmail, type EmailContent } from "@/lib/email-render";
import { absoluteUrl, routes, siteOrigin } from "@/lib/routes";
import { unsubscribeToken, type EmailCategory } from "@/lib/unsubscribe";
import type { Mailer } from "./mailer";
import { isSuppressed, unsubscribeSecret } from "./suppressions";

export type EmailType =
  | "claim_confirmation"
  | "boost_receipt"
  | "outbid_alert"
  | "reminder"
  | "your_day"
  | "boost_digest"
  | "admin_claim";

export type SendInput = {
  type: EmailType;
  to: string;
  /** The same key never sends twice (Stripe retries, overlapping cron runs). */
  dedupeKey: string;
  content: EmailContent;
  /** The app's clock (DEV_NOW-aware), recorded as the log's sent time. */
  at: Date;
  /** Emails people can switch off get an unsubscribe link and one-click headers (spec §8). */
  category?: EmailCategory;
  meta?: Record<string, unknown>;
};

export type SendResult = "sent" | "duplicate" | "suppressed";

/**
 * Sends one email at most once. The email_log row is reserved before sending,
 * so a second caller with the same dedupe key stops there. If the send fails,
 * the reservation is removed so the next attempt can try again. Throws on a
 * failed send; callers count it and move on.
 */
export async function sendEmail(db: Executor, mailer: Mailer, input: SendInput): Promise<SendResult> {
  const to = input.to.trim().toLowerCase();
  if (input.category && (await isSuppressed(db, to, input.category))) return "suppressed";

  const [reserved] = await db
    .insert(emailLog)
    .values({ type: input.type, to, dedupeKey: input.dedupeKey, meta: input.meta ?? {}, sentAt: input.at })
    .onConflictDoNothing({ target: emailLog.dedupeKey })
    .returning({ id: emailLog.id });
  if (!reserved) return "duplicate";

  const token = input.category ? unsubscribeToken(to, input.category, unsubscribeSecret()) : null;
  const rendered = renderEmail(input.content, {
    origin: siteOrigin(),
    unsubscribeUrl: token ? absoluteUrl(routes.unsubscribe(token)) : undefined,
    footerAddress: process.env.EMAIL_FOOTER_ADDRESS || undefined,
  });
  const headers = token
    ? {
        "List-Unsubscribe": `<${absoluteUrl(routes.unsubscribeOneClick(token))}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      }
    : undefined;

  try {
    const { id } = await mailer.send({ to, subject: rendered.subject, html: rendered.html, text: rendered.text, headers });
    if (id) await db.update(emailLog).set({ providerId: id }).where(eq(emailLog.id, reserved.id));
  } catch (error) {
    await db.delete(emailLog).where(eq(emailLog.id, reserved.id));
    throw error;
  }
  return "sent";
}

/** What a batch of sends did. Failures are counted, not thrown, so one bad address can't stop the rest. */
export type EmailRun = { sent: number; skipped: number; failed: number; errors: string[] };

export function emptyRun(): EmailRun {
  return { sent: 0, skipped: 0, failed: 0, errors: [] };
}

export function addRuns(...runs: EmailRun[]): EmailRun {
  return runs.reduce(
    (total, r) => ({
      sent: total.sent + r.sent,
      skipped: total.skipped + r.skipped,
      failed: total.failed + r.failed,
      errors: [...total.errors, ...r.errors],
    }),
    emptyRun(),
  );
}

/** Sends and tallies. "failed" means try again later; anything else is settled. */
export async function sendCounted(
  db: Executor,
  mailer: Mailer,
  input: SendInput,
  run: EmailRun,
): Promise<SendResult | "failed"> {
  try {
    const result = await sendEmail(db, mailer, input);
    if (result === "sent") run.sent += 1;
    else run.skipped += 1;
    return result;
  } catch (error) {
    run.failed += 1;
    run.errors.push(`${input.type} ${input.dedupeKey}: ${error instanceof Error ? error.message : String(error)}`);
    return "failed";
  }
}
