import { notFound } from "next/navigation";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { now } from "@/lib/clock";
import { instantOn, parseDayParam } from "@/lib/day-cache";

/**
 * The moment a page is drawn for. A saved page (lib/day-cache.ts) is drawn for the Eastern day in
 * its address; a per-request page (`day` null) for right now. An address that isn't a day is a 404.
 */
export function pageInstant(day: string | null): Date {
  if (day === null) return now();
  const date = parseDayParam(day);
  if (!date) notFound();
  return instantOn(date, now(), BIRTHDAY_BOARD_TYPE.settings.timezone);
}
