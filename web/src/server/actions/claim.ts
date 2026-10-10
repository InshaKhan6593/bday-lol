"use server";

import { randomUUID } from "node:crypto";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { isValidMonthDay } from "@/lib/birthday";
import { claimCheckoutParams } from "@/lib/checkout";
import { validateClaim, type ClaimField } from "@/lib/claim";
import { isGiftService, type GiftEntry } from "@/lib/gifts";
import { now } from "@/lib/clock";
import { routes, siteOrigin } from "@/lib/routes";
import { ensureCurrentBoard } from "../boards";
import { getClaimPageData } from "../claim-page";
import { createPendingClaim } from "../payments";
import { getBirthdaySettings } from "../leaderboard";
import { PhotoError, savePhoto } from "../storage";
import { getStripe } from "../stripe";

export type ClaimActionState = {
  errors?: Partial<Record<ClaimField | "photo" | "form", string>>;
};

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/** The gift rows, sent as giftService / giftValue pairs in order. Unknown apps are dropped. */
function giftRows(form: FormData): GiftEntry[] {
  const services = form.getAll("giftService");
  const values = form.getAll("giftValue");
  return services.flatMap((service, i) => {
    const value = values[i];
    return isGiftService(service) && typeof value === "string" ? [{ service, value }] : [];
  });
}

/**
 * "Pay & claim": checks the claim again on the server (the leader may have
 * changed since the page loaded), saves the photo, creates the Stripe Checkout
 * Session and a pending entry, then sends the browser to Stripe. Nothing goes
 * live until Stripe's webhook confirms the payment.
 */
export async function startClaimCheckout(_prev: ClaimActionState, form: FormData): Promise<ClaimActionState> {
  const md = { month: Number(text(form, "month")), day: Number(text(form, "day")) };
  if (!isValidMonthDay(md)) return { errors: { form: "Pick a date." } };
  const rankText = text(form, "rank");
  const rank = /^[1-9]\d{0,3}$/.test(rankText) ? Number(rankText) : 1;

  const instant = now();
  const page = await getClaimPageData(db, md, rank, instant);
  const result = validateClaim(
    {
      md,
      bid: text(form, "bid"),
      name: text(form, "name"),
      bio: text(form, "bio"),
      giftLinks: giftRows(form),
      theme: text(form, "theme"),
      email: text(form, "email"),
    },
    page.minCents,
    page.target,
    page.settings,
  );
  if (!result.ok) return { errors: result.errors };

  let photoUrl: string | null = null;
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      photoUrl = await savePhoto(new Uint8Array(await photo.arrayBuffer()));
    } catch (error) {
      if (error instanceof PhotoError) return { errors: { photo: error.message } };
      throw error;
    }
  }

  const type = await getBirthdaySettings(db);
  const board = await ensureCurrentBoard(db, { id: type.typeId, settings: type.settings }, md, instant);
  const ids = { entryId: randomUUID(), paymentId: randomUUID() };

  let checkoutUrl: string;
  try {
    const session = await getStripe().checkout.sessions.create(
      claimCheckoutParams({
        md,
        year: page.year!,
        amountCents: result.claim.amountCents,
        email: result.claim.email,
        metadata: { kind: "claim", paymentId: ids.paymentId, entryId: ids.entryId, boardId: board.id },
        origin: siteOrigin(),
        cancelPath: routes.claim(md, rank),
        now: instant,
      }),
    );
    await createPendingClaim(db, { ids, boardId: board.id, sessionId: session.id, claim: result.claim, photoUrl });
    if (!session.url) throw new Error("Stripe returned no Checkout URL.");
    checkoutUrl = session.url;
  } catch (error) {
    console.error("[claim] could not start checkout", error);
    return { errors: { form: "We couldn’t open checkout. Nothing was charged. Please try again." } };
  }
  // An external URL (checkout.stripe.com); typed routes only know our own paths.
  redirect(checkoutUrl as Route);
}
