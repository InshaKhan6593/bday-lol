import { CompedForm } from "@/components/admin/CompedForm";
import { db } from "@/db";
import { requireAdmin } from "@/server/admin-session";
import { now } from "@/lib/clock";
import { getBirthdaySettings, getCurrentLeaders } from "@/server/leaderboard";

/** /admin/comped: add a free featured listing to any date. */
export default async function AdminCompedPage() {
  await requireAdmin();
  const { typeId, settings } = await getBirthdaySettings(db);
  const leaders = await getCurrentLeaders(db, typeId, now());
  return (
    <CompedForm
      limits={{ nameMaxLength: settings.nameMaxLength, bioMaxLength: settings.bioMaxLength }}
      startTheme={settings.claimTheme}
      rules={{ minOpenBidCents: settings.minOpenBidCents, minStepCents: settings.minStepCents }}
      leaders={Object.fromEntries(Object.entries(leaders).map(([key, l]) => [key, { name: l.name, totalCents: l.totalCents, count: l.count }]))}
    />
  );
}
