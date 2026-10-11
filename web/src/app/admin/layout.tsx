import type { Metadata } from "next";
// Layered, so Mantine's styles sit in their own cascade layer and never fight the site's.
import "@mantine/core/styles.layer.css";
import "@mantine/notifications/styles.layer.css";
import { AdminProviders } from "@/components/admin/AdminProviders";

/** The hidden admin (07 B14). Never indexed; robots.txt blocks it too. Mantine loads here and nowhere else. */
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminProviders>{children}</AdminProviders>;
}
