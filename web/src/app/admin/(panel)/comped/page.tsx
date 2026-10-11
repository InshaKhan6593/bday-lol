import { CompedForm } from "@/components/admin/CompedForm";
import { db } from "@/db";
import { requireAdmin } from "@/server/admin-session";
import { getBirthdaySettings } from "@/server/leaderboard";

/** /admin/comped: add a free featured listing to any date. */
export default async function AdminCompedPage() {
  await requireAdmin();
  const { settings } = await getBirthdaySettings(db);
  return (
    <CompedForm
      limits={{ nameMaxLength: settings.nameMaxLength, bioMaxLength: settings.bioMaxLength }}
      startTheme={settings.claimTheme}
      openBidCents={settings.minOpenBidCents}
    />
  );
}
