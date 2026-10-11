import { ListingsScreen } from "@/components/admin/ListingsScreen";
import { db } from "@/db";
import { parseKey } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { getCompedAmounts, listAdminEntries } from "@/server/admin";
import { requireAdmin } from "@/server/admin-session";
import { getBirthdaySettings } from "@/server/leaderboard";

type Props = { searchParams: Promise<{ date?: string; q?: string; status?: string; added?: string }> };

/** /admin: the listings on every open board. ?date=10-07 shows one board in rank order. */
export default async function AdminListingsPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const date = typeof params.date === "string" && parseKey(params.date) ? params.date : "";
  const q = typeof params.q === "string" ? params.q.slice(0, 40) : "";
  const status = params.status === "live" || params.status === "removed" ? params.status : "all";

  const entries = await listAdminEntries(db, { key: date || undefined, q, status, limit: date ? 500 : 100 }, now());
  const compedCents = await getCompedAmounts(db, entries.filter((e) => e.isComped).map((e) => e.id));
  const { settings } = await getBirthdaySettings(db);

  return (
    <ListingsScreen
      entries={entries}
      filter={{ date, q, status }}
      compedCents={compedCents}
      limits={{ nameMaxLength: settings.nameMaxLength, bioMaxLength: settings.bioMaxLength }}
      justAdded={params.added === "1"}
    />
  );
}
