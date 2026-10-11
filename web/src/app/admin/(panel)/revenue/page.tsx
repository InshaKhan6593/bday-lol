import { RevenueScreen } from "@/components/admin/RevenueScreen";
import { db } from "@/db";
import { now } from "@/lib/clock";
import { dayParam } from "@/lib/day-cache";
import { getRevenue } from "@/server/admin";
import { requireAdmin } from "@/server/admin-session";
import { getBirthdaySettings } from "@/server/leaderboard";

/** /admin/revenue: paid claims and boosts by month and day (07 B15). */
export default async function AdminRevenuePage() {
  await requireAdmin();
  const { settings } = await getBirthdaySettings(db);
  const instant = now();
  const today = dayParam(instant, settings.timezone);
  return <RevenueScreen revenue={await getRevenue(db, instant, settings.timezone)} today={today} thisMonth={today.slice(0, 7)} />;
}
