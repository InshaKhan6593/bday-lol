import { connection } from "next/server";
import { db } from "@/db";
import { formatLong } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { formatUsd, minToTakeTop } from "@/lib/money";
import { routes } from "@/lib/routes";
import { getHomepageData } from "@/server/homepage";
import { cardImage, OG_CONTENT_TYPE, OG_SIZE } from "@/server/og-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Today's birthday on mybday.lol";

/** The homepage's share image: today's #1, or today up for grabs. */
export default async function Image() {
  await connection();
  const home = await getHomepageData(db, now());
  const { leader, today, settings } = home;
  return cardImage(
    leader
      ? {
          theme: home.theme,
          kicker: "Today's birthday",
          headline: formatLong(today),
          line: leader.name,
          avatar: { name: leader.name, photoUrl: leader.photoUrl },
          path: routes.home,
        }
      : {
          theme: home.theme,
          kicker: "Up for grabs",
          headline: formatLong(today),
          line: `Own today for ${formatUsd(minToTakeTop(null, settings))}`,
          avatar: { symbol: "?" },
          path: routes.home,
        },
  );
}
