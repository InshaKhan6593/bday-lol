import type { BoardTypeSettings } from "@/config/board-types";

type MoneyRules = Pick<BoardTypeSettings, "minOpenBidCents" | "minStepCents" | "minBoostCents">;

/** "$12,500". Whole dollars only, like the mockup. */
export function formatUsd(cents: number): string {
  return "$" + Math.round(cents / 100).toLocaleString("en-US");
}

/** Smallest bid that passes someone with this total. */
export function minToPass(totalCents: number, rules: MoneyRules): number {
  return totalCents + rules.minStepCents;
}

/** Smallest bid that takes #1: top total + $1, or the opening bid on an empty board. */
export function minToTakeTop(topTotalCents: number | null, rules: MoneyRules): number {
  return topTotalCents === null ? rules.minOpenBidCents : minToPass(topTotalCents, rules);
}
