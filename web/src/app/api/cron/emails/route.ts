import { db } from "@/db";
import { now } from "@/lib/clock";
import { getMailer } from "@/server/email/mailer";
import { runEmailTick } from "@/server/email/scheduled";

/**
 * The email timer: outbid alerts, the hourly "You got boosted" digest, "Your
 * day is here" and reminders. Vercel Cron calls it (vercel.json) with
 * `Authorization: Bearer $CRON_SECRET`. Locally, run `pnpm emails:tick`.
 *
 * It is built to run every minute ("* * * * *"), which needs Vercel Pro. While the
 * project is on the Hobby plan (one run a day at most) it runs once, after 13:05 UTC:
 * past 8 AM Eastern in both summer and winter, when "Your day is here" is due.
 * Set the schedule back to every minute as soon as the project is on Pro.
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
