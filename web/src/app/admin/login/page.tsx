import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { routes } from "@/lib/routes";
import { isAdmin } from "@/server/admin-session";

/** /admin/login: the email and password sign-in. Someone already signed in goes straight to the listings. */
export default async function AdminLoginPage() {
  if (await isAdmin()) redirect(routes.admin.listings);
  return <LoginForm />;
}
