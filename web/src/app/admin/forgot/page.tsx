import { redirect } from "next/navigation";
import { ForgotForm } from "@/components/admin/ForgotForm";
import { routes } from "@/lib/routes";
import { isAdmin } from "@/server/admin-session";

/** /admin/forgot: a code by email, then a new password. Someone already signed in changes it under Account. */
export default async function AdminForgotPage() {
  if (await isAdmin()) redirect(routes.admin.account);
  return <ForgotForm />;
}
