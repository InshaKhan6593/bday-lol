import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/server/admin-session";

/** Every admin screen: signed in or sent to /admin/login. The actions check the sign-in again themselves. */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
