import { ListingsScreen } from "@/components/admin/ListingsScreen";
import { db } from "@/db";
import { parseKey } from "@/lib/birthday";
import { now } from "@/lib/clock";
import {
  ADMIN_BROWSER_LIMIT,
  ADMIN_PAGE_SIZE,
  ADMIN_SORTS,
  ADMIN_VIEWS,
  DEFAULT_ADMIN_SORT,
  countAdminEntries,
  countAdminViews,
  lastAdminPage,
  listAdminEntries,
  type AdminEntryFilter,
  type AdminSort,
  type AdminView,
} from "@/server/admin";
import { requireAdmin } from "@/server/admin-session";
import { cachedReads } from "@/server/cached";

type Props = {
  searchParams: Promise<{ date?: string; q?: string; status?: string; sort?: string; dir?: string; page?: string; added?: string }>;
};

/** /admin: the listings on every open board, newest first, 50 to a page. ?date=10-07 shows one board. */
export default async function AdminListingsPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const date = typeof params.date === "string" && parseKey(params.date) ? params.date : "";
  const q = typeof params.q === "string" ? params.q.slice(0, 40) : "";
  const status: AdminView = ADMIN_VIEWS.find((view) => view === params.status) ?? "all";
  const by = ADMIN_SORTS.find((column) => column === params.sort);
  const sort: AdminSort = by ? { by, dir: params.dir === "asc" ? "asc" : "desc" } : DEFAULT_ADMIN_SORT;
  const asked = typeof params.page === "string" && /^\d{1,6}$/.test(params.page) ? Number(params.page) : 1;

  const instant = now();
  // The counts and the whole list go out together. The list is all of it while the boards hold up to
  // ADMIN_BROWSER_LIMIT listings: the browser then searches, sorts and pages it with no more trips.
  const [counts, everything, { settings }] = await Promise.all([
    countAdminViews(db, instant),
    listAdminEntries(db, {}, instant, ADMIN_BROWSER_LIMIT),
    cachedReads.settings(),
  ]);
  const shared = {
    filter: { date, q, status, sort },
    timeZone: settings.timezone,
    limits: { nameMaxLength: settings.nameMaxLength, bioMaxLength: settings.bioMaxLength, maxGiftLinks: settings.maxGiftLinks },
    justAdded: params.added === "1",
  };
  if (counts.all <= ADMIN_BROWSER_LIMIT) {
    return <ListingsScreen {...shared} mode="browser" entries={everything} counts={counts} paging={{ page: asked, total: counts.all, pageSize: ADMIN_PAGE_SIZE }} />;
  }

  // A bigger site: the server finds the page asked for, one trip per click, as before.
  const filter: AdminEntryFilter = { key: date || undefined, q, status, sort };
  const total = await countAdminEntries(db, filter, instant);
  // A page number beyond the end (a stale link, or the last listing on a page was just removed) shows the last page.
  const page = Math.min(Math.max(1, asked), lastAdminPage(total));
  const entries = await listAdminEntries(db, { ...filter, page }, instant);
  return <ListingsScreen {...shared} mode="server" entries={entries} counts={counts} paging={{ page, total, pageSize: ADMIN_PAGE_SIZE }} />;
}
