import { RevenueScreen } from "@/components/admin/RevenueScreen";
import { db } from "@/db";
import { now } from "@/lib/clock";
import { getRevenue } from "@/server/admin";
import { requireAdmin } from "@/server/admin-session";
import { cachedReads } from "@/server/cached";

/** /admin/revenue: paid claims and boosts by month and day (07 B15). */
export default async function AdminRevenuePage() {
  await requireAdmin();
  const { settings } = await cachedReads.settings();
  return <RevenueScreen revenue={await getRevenue(db, now(), settings.timezone)} />;
}
