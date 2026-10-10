"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { now } from "@/lib/clock";
import { routes } from "@/lib/routes";
import { readUnsubscribeToken } from "@/lib/unsubscribe";
import { unsubscribe, unsubscribeSecret } from "../email/suppressions";

/** The "Unsubscribe" button on /unsubscribe. The signed token says who and from what. */
export async function confirmUnsubscribe(form: FormData): Promise<void> {
  const token = form.get("t");
  const parsed = readUnsubscribeToken(token, unsubscribeSecret());
  if (parsed) await unsubscribe(db, parsed.email, parsed.category, now());
  redirect(`${routes.unsubscribe(String(token ?? ""))}&done=1` as Parameters<typeof redirect>[0]);
}
