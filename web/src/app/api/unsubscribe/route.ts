import { db } from "@/db";
import { now } from "@/lib/clock";
import { readUnsubscribeToken } from "@/lib/unsubscribe";
import { unsubscribe, unsubscribeSecret } from "@/server/email/suppressions";

/**
 * One-click unsubscribe (RFC 8058). Gmail and Apple Mail show their own
 * "Unsubscribe" button for emails with List-Unsubscribe-Post, and POST here.
 * The link in the email body goes to the /unsubscribe page instead, which asks
 * first (link scanners open links, but they don't POST).
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("t");
  const parsed = readUnsubscribeToken(token, unsubscribeSecret());
  if (!parsed) return new Response("Invalid unsubscribe link", { status: 400 });
  await unsubscribe(db, parsed.email, parsed.category, now());
  return new Response("Unsubscribed", { status: 200 });
}
