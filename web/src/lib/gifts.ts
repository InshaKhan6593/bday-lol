import type { GiftLink, GiftService } from "@/db/schema";

export const GIFT_SERVICES: Record<GiftService, { short: string; label: string }> = {
  venmo: { short: "Venmo", label: "Send on Venmo" },
  cashapp: { short: "Cash App", label: "Send on Cash App" },
  amazon: { short: "Amazon", label: "Shop my Amazon wishlist" },
  throne: { short: "Throne", label: "Gift me on Throne" },
};

/**
 * Gift buttons for the homepage #1 card: one link shows the full label
 * ("Send on Venmo"), two or three show short names ("Venmo", "Cash App").
 */
export function giftButtons(links: GiftLink[]): Array<{ url: string; label: string }> {
  const full = links.length === 1;
  return links.map((link) => ({
    url: link.url,
    label: full ? GIFT_SERVICES[link.service].label : GIFT_SERVICES[link.service].short,
  }));
}
