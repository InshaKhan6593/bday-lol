import type { MonthDay } from "./birthday";

/** Facts for the "About [date] birthdays" section (tables from the mockup, 05-business-logic.md). */

/** Each sign with the last day it covers (month, day), in calendar order. */
const ZODIAC: Array<[sign: string, month: number, lastDay: number]> = [
  ["Capricorn", 1, 19],
  ["Aquarius", 2, 18],
  ["Pisces", 3, 20],
  ["Aries", 4, 19],
  ["Taurus", 5, 20],
  ["Gemini", 6, 20],
  ["Cancer", 7, 22],
  ["Leo", 8, 22],
  ["Virgo", 9, 22],
  ["Libra", 10, 22],
  ["Scorpio", 11, 21],
  ["Sagittarius", 12, 21],
];

const BIRTHSTONES = [
  "Garnet", "Amethyst", "Aquamarine", "Diamond", "Emerald", "Pearl",
  "Ruby", "Peridot", "Sapphire", "Opal", "Topaz", "Turquoise",
] as const;

const BIRTH_FLOWERS = [
  "Carnation", "Violet", "Daffodil", "Daisy", "Lily of the valley", "Rose",
  "Larkspur", "Gladiolus", "Aster", "Marigold", "Chrysanthemum", "Narcissus",
] as const;

export function zodiacSign({ month, day }: MonthDay): string {
  const sign = ZODIAC.find(([, m, last]) => month < m || (month === m && day <= last));
  // After Dec 21 the year wraps back to Capricorn.
  return sign?.[0] ?? "Capricorn";
}

export function birthstone(month: number): string {
  return BIRTHSTONES[month - 1]!;
}

export function birthFlower(month: number): string {
  return BIRTH_FLOWERS[month - 1]!;
}

/** 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st… */
export function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]!);
}
