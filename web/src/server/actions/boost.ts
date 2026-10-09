"use server";

import { randomUUID } from "node:crypto";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { boostReturnPath, parseAmountCents } from "@/lib/boost";
import { boostCheckoutParams } from "@/lib/checkout";
import { now } from "@/lib/clock";
import { formatUsd } from "@/lib/money";
import { siteOrigin } from "@/lib/routes";
import { getBoostableEntry } from "../boosts";
import { getBirthdaySettings } from "../leaderboard";
import { createPendingBoost } from "../payments";
import { getStripe } from "../stripe";

export type BoostActionState = { error?: string };

/** Stripe's ceiling for one Checkout payment ($999,999.99), in whole dollars. */
const MAX_BOOST_CENTS = 999_999_00;

/**
 * "Boost $X": checks the amount and that the person can still be boosted,
 * creates a pending boost payment and a Stripe Checkout Session, then sends
 * the browser to Stripe. The total changes only when the webhook confirms it.
 */
export async function startBoostCheckout(_prev: BoostActionState, form: FormData): Promise<BoostActionState> {
  const publicId = form.get("entry");
  const amountCents = parseAmountCents(String(form.get("amount") ?? ""));
  const alertOptIn = form.get("alert") === "on";
  const returnPath = boostReturnPath(form.get("returnPath"));
  const instant = now();

  const { settings } = await getBirthdaySettings(db);
  if (amountCents < settings.minBoostCents) return { error: `Boosts start at ${formatUsd(settings.minBoostCents)}.` };
  if (amountCents > MAX_BOOST_CENTS) return { error: `Boosts can be up to ${formatUsd(MAX_BOOST_CENTS)}.` };

  const found = typeof publicId === "string" ? await getBoostableEntry(db, publicId, instant) : null;
  if (!found?.ok) {
    return {
      error:
        found?.reason === "closed"
          ? "This birthday has ended, so it can't be boosted any more."
          : "We couldn't find this person. Refresh the page and try again.",
    };
  }
  const { entry } = found;
  const paymentId = randomUUID();

  let checkoutUrl: string;
  try {
    const session = await getStripe().checkout.sessions.create(
      boostCheckoutParams({
        name: entry.name,
        amountCents,
        metadata: { kind: "boost", paymentId, entryId: entry.entryId, boardId: entry.boardId },
        origin: siteOrigin(),
        returnPath,
        now: instant,
      }),
    );
    await createPendingBoost(db, { paymentId, entryId: entry.entryId, sessionId: session.id, amountCents, alertOptIn });
    if (!session.url) throw new Error("Stripe returned no Checkout URL.");
    checkoutUrl = session.url;
  } catch (error) {
    console.error("[boost] could not start checkout", error);
    return { error: "We couldn’t open checkout. Nothing was charged. Please try again." };
  }
  // An external URL (checkout.stripe.com); typed routes only know our own paths.
  redirect(checkoutUrl as Route);
}
