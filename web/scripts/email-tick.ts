// Sends every scheduled email that is due right now (what Vercel Cron does every minute in production).
// Respects DEV_NOW: `DEV_NOW=2026-10-07T08:05:00-04:00 pnpm emails:tick` sends Oct 7's "Your day is here".
// Emails land in Mailpit locally: http://localhost:8030
import "./load-env";
import { db } from "@/db";
import { now } from "@/lib/clock";
import { getMailer } from "@/server/email/mailer";
import { runEmailTick } from "@/server/email/scheduled";

const instant = now();
const run = await runEmailTick(db, getMailer(), instant);
console.log(`Email tick at ${instant.toISOString()}: ${run.sent} sent, ${run.skipped} skipped, ${run.failed} failed`);
for (const error of run.errors) console.error(`  ${error}`);
process.exit(run.failed ? 1 : 0);
