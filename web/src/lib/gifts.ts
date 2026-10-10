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

// ---------------------------------------------------------------------------
// Claim form rows (handoff v2): an app dropdown + a username or wishlist link
// ---------------------------------------------------------------------------

/** One row on the Claim form: the app picked and what was typed. */
export type GiftEntry = { service: GiftService; value: string };

/** Dropdown order. */
export const GIFT_SERVICE_ORDER: GiftService[] = ["venmo", "cashapp", "amazon", "throne"];

export function isGiftService(value: unknown): value is GiftService {
  return typeof value === "string" && (GIFT_SERVICE_ORDER as string[]).includes(value);
}

/**
 * Per app: the fixed sign shown in the box, placeholders, the input's label,
 * and the error under it. Amazon has no username, only a wishlist link.
 */
export const GIFT_ENTRY: Record<
  GiftService,
  { prefix: "@" | "$" | null; placeholder: string; placeholderShort: string; inputLabel: string; error: string }
> = {
  venmo: { prefix: "@", placeholder: "username", placeholderShort: "username", inputLabel: "Venmo username", error: "Please enter a correct @username" },
  cashapp: { prefix: "$", placeholder: "cashtag", placeholderShort: "cashtag", inputLabel: "Cash App cashtag", error: "Please enter a correct $cashtag" },
  amazon: {
    prefix: null,
    placeholder: "Paste your Amazon wishlist link",
    placeholderShort: "Wishlist link",
    inputLabel: "Amazon wishlist link",
    error: "Please enter a correct wishlist link",
  },
  throne: { prefix: "@", placeholder: "username", placeholderShort: "username", inputLabel: "Throne username", error: "Please enter a correct username" },
};

const USERNAME: Record<Exclude<GiftService, "amazon">, RegExp> = {
  venmo: /^[a-z0-9_-]{2,30}$/i,
  cashapp: /^[a-z][a-z0-9_]{0,19}$/i,
  throne: /^[a-z0-9_-]{2,30}$/i,
};

/** Text with a dot or slash in it is a pasted link, not a username. */
export function looksLikeLink(value: string): boolean {
  return /[./]/.test(value);
}

/** The app a pasted full link belongs to, or null ("cash.app/$sam" → cashapp). */
export function serviceOfLink(value: string): GiftService | null {
  const parsed = parseGiftLink(value);
  return parsed.kind === "ok" ? parsed.link.service : null;
}

/** A typed @ or $ is dropped, so it can't double up with the fixed one in the box. */
export function stripHandlePrefix(value: string): string {
  return looksLikeLink(value) ? value : value.replace(/^[@$\s]+/, "");
}

/**
 * Typing in a row: pasting a full link switches the row to that link's app
 * (unless another row already uses it); usernames lose any typed @ or $.
 */
export function typeInGiftRow(entry: GiftEntry, value: string, usedElsewhere: GiftService[]): GiftEntry {
  const detected = serviceOfLink(value);
  const service = detected && !usedElsewhere.includes(detected) ? detected : entry.service;
  return { service, value: stripHandlePrefix(value) };
}

/** Switching a row's app also strips any @ or $ already typed. */
export function switchGiftApp(entry: GiftEntry, service: GiftService): GiftEntry {
  return { service, value: stripHandlePrefix(entry.value) };
}

/** The app "+ Add another" starts with: the first one not used yet. */
export function nextUnusedService(entries: GiftEntry[]): GiftService | null {
  const used = new Set(entries.map((e) => e.service));
  return GIFT_SERVICE_ORDER.find((s) => !used.has(s)) ?? null;
}

/**
 * Turns a row into the link its button opens: venmo.com/u/{username},
 * cash.app/${cashtag}, throne.com/{username}, or the Amazon wishlist link as
 * entered. A full link works for any app, as long as it's for the app picked.
 */
export function parseGiftEntry(entry: GiftEntry): ParsedGiftLink {
  const value = entry.value.trim();
  if (!value) return { kind: "empty" };
  if (looksLikeLink(value)) {
    const parsed = parseGiftLink(value);
    return parsed.kind === "ok" && parsed.link.service === entry.service ? parsed : { kind: "bad" };
  }
  if (entry.service === "amazon") return { kind: "bad" };
  const handle = stripHandlePrefix(value);
  if (!USERNAME[entry.service].test(handle)) return { kind: "bad" };
  const url = {
    venmo: `https://venmo.com/u/${handle}`,
    cashapp: `https://cash.app/$${handle}`,
    throne: `https://throne.com/${handle}`,
  }[entry.service];
  return { kind: "ok", link: { service: entry.service, url } };
}

/** The live line under a row: "Your spot will show a "Send on Venmo" button", or the app's error. */
export function giftEntryHint(entry: GiftEntry): { text: string; tone: "strong" | "error" } | null {
  const parsed = parseGiftEntry(entry);
  if (parsed.kind === "empty") return null;
  if (parsed.kind === "bad") return { text: GIFT_ENTRY[entry.service].error, tone: "error" };
  return { text: `Your spot will show a “${GIFT_SERVICES[entry.service].label}” button`, tone: "strong" };
}
