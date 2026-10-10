import { routes } from "@/lib/routes";
import { cardImage, OG_CONTENT_TYPE, OG_SIZE } from "@/server/og-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "How mybday.lol works";

/** How it works' share image: the page's headline on Butter. */
export default async function Image() {
  return cardImage({
    theme: "butter",
    kicker: "How it works",
    headline: "One birthday.",
    line: "The whole internet.",
    avatar: { symbol: "#1" },
    path: routes.howItWorks,
  });
}
