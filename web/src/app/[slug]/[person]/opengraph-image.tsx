import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { db } from "@/db";
import { formatLong, parseSlug, zonedDate } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { routes } from "@/lib/routes";
import { linkCardKicker } from "@/lib/success";
import { getPersonOnBoard } from "@/server/people";
import { cardImage, OG_CONTENT_TYPE, OG_SIZE } from "@/server/og-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Birthday card from mybday.lol";

/** A personal link's share image: that person's own card (handoff v2), like the Success page preview. */
export default async function Image({ params }: { params: Promise<{ slug: string; person: string }> }) {
  const { slug, person } = await params;
  const parsed = parseSlug(slug);
  if (parsed?.kind !== "date") notFound();
  await connection();
  const instant = now();
  const found = await getPersonOnBoard(db, parsed.md, person, instant);
  if (!found) notFound();
  const today = zonedDate(instant, BIRTHDAY_BOARD_TYPE.settings.timezone);
  const isToday = today.month === parsed.md.month && today.day === parsed.md.day;
  return cardImage({
    theme: found.theme,
    kicker: linkCardKicker(isToday),
    headline: formatLong(parsed.md),
    line: found.name,
    avatar: { name: found.name, photoUrl: found.photoUrl },
    path: routes.person(parsed.md, person),
  });
}
