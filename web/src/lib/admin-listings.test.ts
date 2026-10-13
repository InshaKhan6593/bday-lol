import { describe, expect, it } from "vitest";
import {
  ADMIN_PAGE_SIZE,
  applyChange,
  compedAmountError,
  countViews,
  DEFAULT_ADMIN_SORT,
  listingFromForm,
  matchesFilter,
  sortListings,
  viewListings,
  withEdit,
  withStatus,
  type AdminEntry,
  type ListingsFilter,
} from "./admin-listings";

let made = 0;
/** A listing with everything filled in; `over` sets what a test cares about. */
function entry(over: Partial<AdminEntry> = {}): AdminEntry {
  made += 1;
  const id = `00000000-0000-4000-8000-${String(made).padStart(12, "0")}`;
  return {
    id,
    publicId: `p${made}`,
    slug: `person-${made}`,
    boardKey: "10-07",
    year: 2026,
    rank: 1,
    name: `Person ${made}`,
    bio: "",
    photoUrl: null,
    theme: "sky",
    giftLinks: [],
    isMinor: false,
    isComped: false,
    status: "live",
    totalCents: 500,
    ownerEmail: null,
    liveAt: "2026-10-07T12:00:00.000Z",
    compedCents: null,
    ...over,
  };
}

const everything: ListingsFilter = { date: "", q: "", status: "all", sort: DEFAULT_ADMIN_SORT };
const names = (rows: AdminEntry[]) => rows.map((r) => r.name);

function board() {
  const jess = entry({ name: "Jess Moreno", rank: 1, totalCents: 24_000, liveAt: "2026-10-07T15:00:00.000Z" });
  const tyler = entry({ name: "Tyler Brooks", rank: 2, totalCents: 22_500, liveAt: "2026-10-07T13:00:00.000Z" });
  const ana = entry({ name: "Ana Reyes", rank: 3, totalCents: 15_000, liveAt: "2026-10-07T12:00:00.000Z" });
  const gone = entry({ name: "tyra banks", rank: null, status: "removed", totalCents: 9_000, liveAt: "2026-10-06T12:00:00.000Z" });
  const free = entry({ name: "Dev Nolan", boardKey: "12-25", rank: 1, isComped: true, compedCents: 4_000, totalCents: 5_000, liveAt: "2026-10-08T12:00:00.000Z" });
  return { jess, tyler, ana, gone, free, all: [jess, tyler, ana, gone, free] };
}

describe("which listings a tab, a date and a search show", () => {
  it("shows everything by default, live or removed", () => {
    const { all } = board();
    expect(all.every((e) => matchesFilter(e, everything))).toBe(true);
  });

  it("keeps the Live and Removed tabs apart, and Comped to the free spots", () => {
    const { all } = board();
    const tab = (status: ListingsFilter["status"]) => names(all.filter((e) => matchesFilter(e, { ...everything, status })));
    expect(tab("live")).toEqual(["Jess Moreno", "Tyler Brooks", "Ana Reyes", "Dev Nolan"]);
    expect(tab("removed")).toEqual(["tyra banks"]);
    expect(tab("comped")).toEqual(["Dev Nolan"]);
  });

  it("finds part of a name in any letter case, on one date or on all", () => {
    const { all } = board();
    const find = (q: string, date = "") => names(all.filter((e) => matchesFilter(e, { ...everything, q, date })));
    expect(find("TY")).toEqual(["Tyler Brooks", "tyra banks"]);
    expect(find("  ty  ")).toEqual(["Tyler Brooks", "tyra banks"]);
    expect(find("", "12-25")).toEqual(["Dev Nolan"]);
    expect(find("ty", "12-25")).toEqual([]);
  });

  it("treats a typed % or _ as a character, like the server's search", () => {
    const { all } = board();
    expect(all.filter((e) => matchesFilter(e, { ...everything, q: "%" }))).toEqual([]);
    expect(all.filter((e) => matchesFilter(e, { ...everything, q: "_" }))).toEqual([]);
  });
});

describe("the order of the listings", () => {
  it("is newest first unless a column is picked", () => {
    const { all } = board();
    expect(names(sortListings(all, DEFAULT_ADMIN_SORT))).toEqual(["Dev Nolan", "Jess Moreno", "Tyler Brooks", "Ana Reyes", "tyra banks"]);
  });

  it("sorts names without minding capitals, both ways", () => {
    const { all } = board();
    expect(names(sortListings(all, { by: "name", dir: "asc" }))).toEqual(["Ana Reyes", "Dev Nolan", "Jess Moreno", "Tyler Brooks", "tyra banks"]);
    expect(names(sortListings(all, { by: "name", dir: "desc" }))).toEqual(["tyra banks", "Tyler Brooks", "Jess Moreno", "Dev Nolan", "Ana Reyes"]);
  });

  it("sorts totals as numbers, not as text", () => {
    const rows = [entry({ name: "nine", totalCents: 900 }), entry({ name: "ten thousand", totalCents: 1_000_000 }), entry({ name: "eighty", totalCents: 8_000 })];
    expect(names(sortListings(rows, { by: "total", dir: "desc" }))).toEqual(["ten thousand", "eighty", "nine"]);
    expect(names(sortListings(rows, { by: "total", dir: "asc" }))).toEqual(["nine", "eighty", "ten thousand"]);
  });

  it("keeps a listing with no rank or no date last, whichever way the column is turned", () => {
    const { all } = board();
    expect(names(sortListings(all, { by: "rank", dir: "asc" })).at(-1)).toBe("tyra banks");
    expect(names(sortListings(all, { by: "rank", dir: "desc" })).at(-1)).toBe("tyra banks");
    const never = entry({ name: "Never Live", liveAt: null });
    expect(names(sortListings([never, ...all], { by: "added", dir: "asc" })).at(-1)).toBe("Never Live");
    expect(names(sortListings([never, ...all], { by: "added", dir: "desc" })).at(-1)).toBe("Never Live");
  });

  it("sorts by birthday and by status", () => {
    const { all } = board();
    expect(names(sortListings(all, { by: "date", dir: "desc" }))[0]).toBe("Dev Nolan");
    expect(names(sortListings(all, { by: "status", dir: "desc" }))[0]).toBe("tyra banks");
  });

  it("settles ties by id, the same every time and whichever way the column is turned", () => {
    const a = entry({ name: "A", totalCents: 500 });
    const b = entry({ name: "B", totalCents: 500 });
    const c = entry({ name: "C", totalCents: 500 });
    for (const dir of ["asc", "desc"] as const) {
      expect(names(sortListings([c, a, b], { by: "total", dir }))).toEqual(["A", "B", "C"]);
    }
  });

  it("leaves the list it was given untouched", () => {
    const { all } = board();
    const before = names(all);
    sortListings(all, { by: "name", dir: "asc" });
    expect(names(all)).toEqual(before);
  });
});

describe("one page of the listings", () => {
  const many = () => Array.from({ length: 120 }, (_, i) => entry({ name: `Person ${String(i + 1).padStart(3, "0")}`, rank: i + 1 }));
  const byRank: ListingsFilter = { ...everything, sort: { by: "rank", dir: "asc" } };

  it("shows 50 at a time: every listing once, in order", () => {
    const all = many();
    const pages = [1, 2, 3].map((page) => viewListings(all, byRank, page));
    expect(pages.map((p) => p.rows.length)).toEqual([ADMIN_PAGE_SIZE, ADMIN_PAGE_SIZE, 20]);
    expect(pages.every((p) => p.total === 120 && p.pages === 3)).toBe(true);
    expect(pages.flatMap((p) => p.rows.map((r) => r.rank))).toEqual(Array.from({ length: 120 }, (_, i) => i + 1));
  });

  it("shows the last page for a page beyond the end, and the first for nonsense", () => {
    const all = many();
    expect(viewListings(all, byRank, 9).page).toBe(3);
    expect(viewListings(all, byRank, 0).page).toBe(1);
    expect(viewListings(all, byRank, Number.NaN).page).toBe(1);
    expect(viewListings(all, byRank, 2.7).page).toBe(2);
  });

  it("has one empty page when nothing matches", () => {
    expect(viewListings(many(), { ...byRank, q: "nobody" }, 1)).toEqual({ rows: [], total: 0, page: 1, pages: 1 });
  });

  it("counts only what the search matches", () => {
    const view = viewListings(many(), { ...byRank, q: "person 01" }, 1);
    expect(view.total).toBe(10);
    expect(view.rows).toHaveLength(10);
  });
});

describe("the counts next to the title", () => {
  it("counts every tab, with a comped listing in its status tab too", () => {
    const { all } = board();
    expect(countViews(all)).toEqual({ all: 5, live: 4, removed: 1, comped: 1 });
    expect(countViews([])).toEqual({ all: 0, live: 0, removed: 0, comped: 0 });
  });
});

describe("a change drawn before the server answers", () => {
  it("takes a listing down: it loses its rank and everyone below on that board moves up", () => {
    const { jess, tyler, ana, free, all } = board();
    const after = withStatus(all, tyler.id, "removed");
    const by = (id: string) => after.find((e) => e.id === id)!;
    expect(by(tyler.id)).toMatchObject({ status: "removed", rank: null });
    expect(by(jess.id).rank).toBe(1);
    expect(by(ana.id).rank).toBe(2);
    // Another date's board is not touched.
    expect(by(free.id).rank).toBe(1);
    expect(countViews(after)).toMatchObject({ live: 3, removed: 2 });
  });

  it("taking down the #1 makes the old #2 the #1", () => {
    const { jess, tyler, all } = board();
    expect(withStatus(all, jess.id, "removed").find((e) => e.id === tyler.id)!.rank).toBe(1);
  });

  it("does not move the same date's board of another year", () => {
    const { tyler, all } = board();
    const lastYear = entry({ name: "Old Board", year: 2025, rank: 3 });
    expect(withStatus([...all, lastYear], tyler.id, "removed").find((e) => e.id === lastYear.id)!.rank).toBe(3);
  });

  it("puts a listing back with no rank yet, and moves nobody", () => {
    const { gone, all } = board();
    const after = withStatus(all, gone.id, "live");
    expect(after.find((e) => e.id === gone.id)).toMatchObject({ status: "live", rank: null });
    expect(after.filter((e) => e.id !== gone.id)).toEqual(all.filter((e) => e.id !== gone.id));
  });

  it("changes nothing for a listing that is already that way, or isn't in the list", () => {
    const { jess, all } = board();
    expect(withStatus(all, jess.id, "live")).toBe(all);
    expect(withStatus(all, "missing", "removed")).toBe(all);
  });

  it("applies an edit to one row and leaves what the edit didn't mention", () => {
    const { ana, jess, all } = board();
    const after = withEdit(all, ana.id, { name: "Ana R.", theme: "mint", photoUrl: null });
    expect(after.find((e) => e.id === ana.id)).toMatchObject({ name: "Ana R.", theme: "mint", photoUrl: null, totalCents: 15_000, rank: 3 });
    expect(after.find((e) => e.id === jess.id)).toBe(jess);
  });

  it("routes each kind of change, and never changes the list it was given", () => {
    const { tyler, all } = board();
    const copy = structuredClone(all);
    expect(applyChange(all, { kind: "status", id: tyler.id, status: "removed" }).find((e) => e.id === tyler.id)!.status).toBe("removed");
    expect(applyChange(all, { kind: "edit", id: tyler.id, patch: { bio: "New" } }).find((e) => e.id === tyler.id)!.bio).toBe("New");
    expect(all).toEqual(copy);
  });
});

describe("the edit form", () => {
  it("accepts whole dollars from $1, and nothing else", () => {
    expect(compedAmountError(100)).toBeNull();
    expect(compedAmountError(100_000_000)).toBeNull();
    for (const bad of [0, 50, 150, -100, 1.5, Number.NaN]) expect(compedAmountError(bad)).toBe("Enter a whole dollar amount.");
    expect(compedAmountError(100_000_100)).toBe("That amount is too large.");
  });

  it("reads the listing a form describes, pairing each gift app with its box", () => {
    const form = new FormData();
    form.set("name", "Sam Rivera");
    form.set("bio", "Hello");
    form.set("theme", "mint");
    form.set("isMinor", "");
    for (const [service, value] of [
      ["venmo", "sam"],
      ["cashapp", ""],
      ["amazon", "https://www.amazon.com/hz/wishlist/ls/ABC"],
    ]) {
      form.append("giftService", service!);
      form.append("giftValue", value!);
    }
    expect(listingFromForm(form)).toEqual({
      name: "Sam Rivera",
      bio: "Hello",
      theme: "mint",
      isMinor: false,
      giftLinks: [
        { service: "venmo", value: "sam" },
        { service: "cashapp", value: "" },
        { service: "amazon", value: "https://www.amazon.com/hz/wishlist/ls/ABC" },
      ],
    });
  });

  it("drops a gift row for an app that doesn't exist, and reads a missing form as empty", () => {
    const form = new FormData();
    form.append("giftService", "paypal");
    form.append("giftValue", "x");
    form.set("isMinor", "1");
    expect(listingFromForm(form)).toEqual({ name: "", bio: "", theme: "", isMinor: true, giftLinks: [] });
  });
});
