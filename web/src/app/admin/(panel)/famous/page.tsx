import { FamousScreen } from "@/components/admin/FamousScreen";
import { db } from "@/db";
import { parseKey, toKey, zonedDate } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { FAMOUS_LISTED } from "@/lib/famous";
import { listAdminFamous } from "@/server/admin";
import { requireAdmin } from "@/server/admin-session";
import { getBirthdaySettings } from "@/server/leaderboard";

type Props = { searchParams: Promise<{ date?: string }> };

/** /admin/famous: the famous people stored for a date (today's unless ?date=10-07), with "Hide this person". */
export default async function AdminFamousPage({ searchParams }: Props) {
  await requireAdmin();
  const { settings } = await getBirthdaySettings(db);
  const asked = (await searchParams).date;
  const md = (typeof asked === "string" && parseKey(asked)) || zonedDate(now(), settings.timezone);
  return <FamousScreen date={toKey(md)} people={await listAdminFamous(db, md)} listed={FAMOUS_LISTED} />;
}
