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

/** Hosts we turn into gift buttons. A host matches itself or any subdomain ("www.venmo.com"). */
const GIFT_HOSTS: Array<[host: string, service: GiftService]> = [
  ["venmo.com", "venmo"],
  ["cash.app", "cashapp"],
  ["amazon.com", "amazon"],
  ["a.co", "amazon"],
  ["throne.com", "throne"],
];

export type ParsedGiftLink = { kind: "empty" } | { kind: "ok"; link: GiftLink } | { kind: "bad" };

/**
 * Reads a pasted gift link. Parses the real host (not a substring match, so
 * "venmo.com.evil.example" is rejected), needs a path ("venmo.com/u/sam", not
 * just "venmo.com"), and stores a clean https URL. "venmo.com/u/sam" without a
 * scheme is fine; http is upgraded to https.
 */
export function parseGiftLink(raw: string): ParsedGiftLink {
  const input = raw.trim();
  if (!input) return { kind: "empty" };
  if (/\s/.test(input)) return { kind: "bad" };

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { kind: "bad" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { kind: "bad" };
  if (url.username || url.password || url.port) return { kind: "bad" };
  if (url.pathname === "/" || url.pathname === "") return { kind: "bad" };

  const host = url.hostname.toLowerCase();
  const match = GIFT_HOSTS.find(([h]) => host === h || host.endsWith(`.${h}`));
  if (!match) return { kind: "bad" };

  url.protocol = "https:";
  url.hash = "";
  return { kind: "ok", link: { service: match[1], url: url.toString() } };
}

/** The live line under a gift link input on the Claim page (mockup copy). */
export function giftLinkHint(parsed: ParsedGiftLink): { text: string; tone: "strong" | "error" } | null {
  if (parsed.kind === "empty") return null;
  if (parsed.kind === "bad") return { text: "We can only use Venmo, Cash App, Amazon, or Throne links", tone: "error" };
  return { text: `Your page will show a “${GIFT_SERVICES[parsed.link.service].label}” button`, tone: "strong" };
}
