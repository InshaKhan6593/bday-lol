import type { ThemeKey } from "@/config/themes";
import type { GiftLink } from "@/db/schema";
import type { ListingInput } from "./claim";
import { isGiftService, type GiftEntry } from "./gifts";

/**
 * The admin's listings, worked out in the browser.
 *
 * Every admin click used to be a trip to the server (about 0.4 s from far away). While the open
 * boards hold at most ADMIN_BROWSER_LIMIT listings the whole list is sent once, and searching,
 * sorting, switching tabs and paging happen here with no trip at all. A change (take down, put back,
 * edit) is drawn at once with the functions at the bottom, while the server confirms it.
 *
 * The rules match the database's (server/admin.ts) so a bigger site, which goes back to asking the
 * server, lists the same rows in the same order.
 */

export type AdminEntry = {
  id: string;
  publicId: string;
  slug: string | null;
  /** The board's date ("10-07") and year. */
  boardKey: string;
  year: number;
  /** Rank among the live people on its board. Null for a removed listing. */
  rank: number | null;
  name: string;
  bio: string;
  photoUrl: string | null;
  theme: ThemeKey;
  giftLinks: GiftLink[];
  isMinor: boolean;
  isComped: boolean;
  status: "live" | "removed";
  totalCents: number;
  ownerEmail: string | null;
  liveAt: string | null;
  /** The comped part of a comped listing's total (boosts people paid on top are not in it). Null when it isn't comped. */
  compedCents: number | null;
};

/** The listings tabs: everything, what's on the boards, what was taken down, and the free spots. */
export const ADMIN_VIEWS = ["all", "live", "removed", "comped"] as const;
export type AdminView = (typeof ADMIN_VIEWS)[number];
export type AdminCounts = Record<AdminView, number>;

/** The columns the listings can be ordered by. "added" is when the listing went live. */
export const ADMIN_SORTS = ["added", "rank", "name", "date", "total", "status"] as const;
export type AdminSort = { by: (typeof ADMIN_SORTS)[number]; dir: "asc" | "desc" };

/** Newest first, unless a column is picked. */
export const DEFAULT_ADMIN_SORT: AdminSort = { by: "added", dir: "desc" };

/** Listings per page in the admin. */
export const ADMIN_PAGE_SIZE = 50;

/** Up to this many listings are sent whole and handled in the browser; beyond it the server pages them. */
export const ADMIN_BROWSER_LIMIT = 1000;

/** The last page a filter has (at least 1), so a page number from the address can be kept in range. */
export function lastAdminPage(total: number): number {
  return Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
}

export type ListingsFilter = {
  /** One date ("10-07"). Every date when empty. */
  date: string;
  /** Part of a name. */
  q: string;
  status: AdminView;
  sort: AdminSort;
};

/** Does a listing belong in this tab, on this date, under this search? */
export function matchesFilter(entry: AdminEntry, filter: Pick<ListingsFilter, "date" | "q" | "status">): boolean {
  if (filter.status === "live" || filter.status === "removed") {
    if (entry.status !== filter.status) return false;
  } else if (filter.status === "comped" && !entry.isComped) {
    return false;
  }
  if (filter.date && entry.boardKey !== filter.date) return false;
  const q = filter.q.trim().toLowerCase();
  return !q || entry.name.toLowerCase().includes(q);
}

const text = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** What a column sorts by. Null goes last whichever way the column is turned. */
function sortValue(entry: AdminEntry, by: AdminSort["by"]): string | number | null {
  switch (by) {
    case "added":
      return entry.liveAt;
    case "rank":
      return entry.rank;
    case "name":
      return entry.name.toLowerCase();
    case "date":
      return entry.boardKey;
    case "total":
      return entry.totalCents;
    case "status":
      return entry.status;
  }
}

/** A copy in the picked order. The id settles ties, so a listing is never on two pages or on none. */
export function sortListings(entries: AdminEntry[], sort: AdminSort): AdminEntry[] {
  const way = sort.dir === "asc" ? 1 : -1;
  return [...entries].sort((a, b) => {
    const x = sortValue(a, sort.by);
    const y = sortValue(b, sort.by);
    if (x !== y) {
      if (x === null) return 1;
      if (y === null) return -1;
      const order = typeof x === "number" && typeof y === "number" ? x - y : text(String(x), String(y));
      if (order !== 0) return order * way;
    }
    return text(a.id, b.id);
  });
}

export type ListingsView = {
  /** The rows of the page being shown. */
  rows: AdminEntry[];
  /** How many listings match in all. */
  total: number;
  /** The page shown: the one asked for, kept in range. */
  page: number;
  pages: number;
};

/** One page of the listings a filter matches, in its order. */
export function viewListings(entries: AdminEntry[], filter: ListingsFilter, page: number): ListingsView {
  const matched = sortListings(
    entries.filter((entry) => matchesFilter(entry, filter)),
    filter.sort,
  );
  const pages = lastAdminPage(matched.length);
  // A page beyond the end (the last listing on a page was just removed) shows the last page.
  const shown = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { rows: matched.slice((shown - 1) * ADMIN_PAGE_SIZE, shown * ADMIN_PAGE_SIZE), total: matched.length, page: shown, pages };
}

/** How many listings each tab holds. */
export function countViews(entries: AdminEntry[]): AdminCounts {
  const counts: AdminCounts = { all: entries.length, live: 0, removed: 0, comped: 0 };
  for (const entry of entries) {
    counts[entry.status] += 1;
    if (entry.isComped) counts.comped += 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// A change drawn before the server answers
// ---------------------------------------------------------------------------

/**
 * The list as it will look once a listing is taken down or put back.
 *
 * Taken down: it loses its rank and everyone below it on that board moves up one, which is exactly
 * what the server does. Put back: where it lands depends on totals this list doesn't hold in full,
 * so it shows no rank until the server's list arrives a moment later.
 */
export function withStatus(entries: AdminEntry[], id: string, status: "live" | "removed"): AdminEntry[] {
  const target = entries.find((entry) => entry.id === id);
  if (!target || target.status === status) return entries;
  const gap = status === "removed" ? target.rank : null;
  return entries.map((entry) => {
    if (entry.id === id) return { ...entry, status, rank: null };
    const below = gap !== null && entry.boardKey === target.boardKey && entry.year === target.year && entry.rank !== null && entry.rank > gap;
    return below ? { ...entry, rank: entry.rank! - 1 } : entry;
  });
}

/** What an edit changes on a row. Left-out fields stay as they are. */
export type ListingPatch = Partial<Pick<AdminEntry, "name" | "bio" | "theme" | "giftLinks" | "isMinor" | "photoUrl" | "totalCents" | "compedCents">>;

/** The list with one listing's edit applied. */
export function withEdit(entries: AdminEntry[], id: string, patch: ListingPatch): AdminEntry[] {
  return entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
}

export type ListingsChange = { kind: "status"; id: string; status: "live" | "removed" } | { kind: "edit"; id: string; patch: ListingPatch };

export function applyChange(entries: AdminEntry[], change: ListingsChange): AdminEntry[] {
  return change.kind === "status" ? withStatus(entries, change.id, change.status) : withEdit(entries, change.id, change.patch);
}

// ---------------------------------------------------------------------------
// The edit form
// ---------------------------------------------------------------------------

/** A comped amount: whole dollars, at least $1, and not beyond what the total column can hold. */
export function compedAmountError(amountCents: number): string | null {
  if (!Number.isInteger(amountCents) || amountCents < 100 || amountCents % 100 !== 0) return "Enter a whole dollar amount.";
  if (amountCents > 100_000_000) return "That amount is too large.";
  return null;
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function giftRows(form: FormData): GiftEntry[] {
  const services = form.getAll("giftService");
  const values = form.getAll("giftValue");
  return services.flatMap((service, i) => {
    const value = values[i];
    return isGiftService(service) && typeof value === "string" ? [{ service, value }] : [];
  });
}

/**
 * The listing a submitted admin form describes. The browser reads it to check the form before
 * sending and the server reads it again on arrival, so both check the very same thing.
 */
export function listingFromForm(form: FormData): ListingInput {
  return {
    name: field(form, "name"),
    bio: field(form, "bio"),
    giftLinks: giftRows(form),
    theme: field(form, "theme"),
    isMinor: field(form, "isMinor") === "1",
  };
}
