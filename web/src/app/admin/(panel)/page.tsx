import { ListingsScreen } from "@/components/admin/ListingsScreen";
import { db } from "@/db";
import { parseKey } from "@/lib/birthday";
import { now } from "@/lib/clock";
import {
  ADMIN_PAGE_SIZE,
  countAdminEntries,
  getCompedAmounts,
  lastAdminPage,
  listAdminEntries,
  type AdminEntryFilter,
} from "@/server/admin";
import { requireAdmin } from "@/server/admin-session";
import { getBirthdaySettings } from "@/server/leaderboard";

type Props = { searchParams: Promise<{ date?: string; q?: string; status?: string; page?: string; added?: string }> };

/** /admin: the listings on every open board, 50 to a page. ?date=10-07 shows one board in rank order. */
export default async function AdminListingsPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const date = typeof params.date === "string" && parseKey(params.date) ? params.date : "";
  const q = typeof params.q === "string" ? params.q.slice(0, 40) : "";
  const status = params.status === "live" || params.status === "removed" ? params.status : "all";

  const instant = now();
  const filter: AdminEntryFilter = { key: date || undefined, q, status };
  const total = await countAdminEntries(db, filter, instant);
  // A page number beyond the end (a stale link, or the last listing on a page was just removed) shows the last page.
  const asked = typeof params.page === "string" && /^\d{1,6}$/.test(params.page) ? Number(params.page) : 1;
  const page = Math.min(Math.max(1, asked), lastAdminPage(total));
  const entries = await listAdminEntries(db, { ...filter, page }, instant);
  const compedCents = await getCompedAmounts(db, entries.filter((e) => e.isComped).map((e) => e.id));
  const { settings } = await getBirthdaySettings(db);

  return (
    <ListingsScreen
      entries={entries}
      filter={{ date, q, status }}
      paging={{ page, total, pageSize: ADMIN_PAGE_SIZE }}
      compedCents={compedCents}
      limits={{ nameMaxLength: settings.nameMaxLength, bioMaxLength: settings.bioMaxLength }}
      justAdded={params.added === "1"}
    />
  );
}
