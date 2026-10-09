import type { Route } from "next";
import { monthSlug, toSlug, type MonthDay } from "./birthday";

/**
 * Every internal URL in one place. The claim, how-it-works and month pages are
 * built in later steps, so their paths are typed here instead of inferred.
 */
export const routes = {
  home: "/" as Route,
  howItWorks: "/how-it-works" as Route,
  /** Claim page, optionally pre-filled with a date and the rank to take ("Claim #2 for $226"). */
  claim: (md?: MonthDay, rank?: number) => {
    if (!md) return "/claim" as Route;
    return `/claim?date=${toSlug(md)}${rank && rank > 1 ? `&rank=${rank}` : ""}` as Route;
  },
  /** Where Stripe Checkout returns after a claim: /claim/success?session_id=cs_… */
  claimSuccess: (sessionId?: string) =>
    (sessionId ? `/claim/success?session_id=${encodeURIComponent(sessionId)}` : "/claim/success") as Route,
  /** The same page as Stripe's success_url: Stripe swaps in the real id ({CHECKOUT_SESSION_ID} must stay unencoded). */
  claimSuccessTemplate: "/claim/success?session_id={CHECKOUT_SESSION_ID}",
  date: (md: MonthDay) => `/${toSlug(md)}` as Route,
  /** "Boost to take #1 back" in outbid emails: the date page opens the Boost box with the amount filled in. */
  boostLink: (md: MonthDay, publicId: string, amountCents: number) =>
    `/${toSlug(md)}?boost=${encodeURIComponent(publicId)}&amount=${Math.round(amountCents / 100)}` as Route,
  month: (month: number) => `/${monthSlug(month)}` as Route,
};

/** The site's origin, e.g. https://bday.lol (no trailing slash). */
export function siteOrigin(): string {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").origin;
}

/** Absolute URL for sharing, e.g. https://bday.lol/october-7. */
export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

/** The share URL as shown on the page, without the protocol: "bday.lol/october-7". */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
