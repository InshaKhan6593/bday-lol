import type { Route } from "next";
import { toSlug, type MonthDay } from "./birthday";

/**
 * Every internal URL in one place. The date, claim and how-it-works pages are
 * built in later steps, so their paths are typed here instead of inferred.
 */
export const routes = {
  home: "/" as Route,
  howItWorks: "/how-it-works" as Route,
  claim: (md?: MonthDay) => (md ? `/claim?date=${toSlug(md)}` : "/claim") as Route,
  date: (md: MonthDay) => `/${toSlug(md)}` as Route,
};

/** Absolute URL for sharing, e.g. https://bday.lol/october-7. */
export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

/** The share URL as shown on the page, without the protocol: "bday.lol/october-7". */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
