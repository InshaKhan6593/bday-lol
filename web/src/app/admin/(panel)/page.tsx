import { ListingsScreen } from "@/components/admin/ListingsScreen";
import { db } from "@/db";
import { parseKey } from "@/lib/birthday";
import { now } from "@/lib/clock";
import {
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

  const instant = now();
  const filter: AdminEntryFilter = { key: date || undefined, q, status, sort };
  // Three reads that don't depend on each other go out together; the settings come from the shared cache.
  const [total, counts, { settings }] = await Promise.all([
    countAdminEntries(db, filter, instant),
    countAdminViews(db, instant),
    cachedReads.settings(),
  ]);
  // A page number beyond the end (a stale link, or the last listing on a page was just removed) shows the last page.
  const asked = typeof params.page === "string" && /^\d{1,6}$/.test(params.page) ? Number(params.page) : 1;
  const page = Math.min(Math.max(1, asked), lastAdminPage(total));
  const entries = await listAdminEntries(db, { ...filter, page }, instant);

  return (
    <ListingsScreen
      entries={entries}
      filter={{ date, q, status, sort }}
      counts={counts}
      timeZone={settings.timezone}
      paging={{ page, total, pageSize: ADMIN_PAGE_SIZE }}
      limits={{ nameMaxLength: settings.nameMaxLength, bioMaxLength: settings.bioMaxLength }}
      justAdded={params.added === "1"}
    />
  );
}
