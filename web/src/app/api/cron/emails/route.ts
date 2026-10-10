import { db } from "@/db";
import { now } from "@/lib/clock";
import { getMailer } from "@/server/email/mailer";
import { runEmailTick } from "@/server/email/scheduled";

/**
 * The email timer: outbid alerts, the hourly "You got boosted" digest, "Your
 * day is here" and reminders. Vercel Cron calls it every minute (vercel.json)
 * with `Authorization: Bearer $CRON_SECRET`. Locally, run `pnpm emails:tick`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") return new Response("CRON_SECRET is not set", { status: 500 });
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const run = await runEmailTick(db, getMailer(), now());
  if (run.failed) console.error("Email tick failures:", run.errors);
  return Response.json(run);
}
