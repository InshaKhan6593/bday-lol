import { AccountScreen } from "@/components/admin/AccountScreen";
import { db } from "@/db";
import { adminEmail, requireAdmin } from "@/server/admin-session";

/** /admin/account: the admin's own sign-in (the email and the password). */
export default async function AdminAccountPage() {
  await requireAdmin();
  return <AccountScreen email={(await adminEmail(db)) ?? null} />;
}
