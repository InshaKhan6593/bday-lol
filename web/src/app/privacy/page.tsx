import type { Metadata } from "next";
import { connection } from "next/server";
import { LegalPageView } from "@/components/legal/LegalPageView";
import { db } from "@/db";
import { routes } from "@/lib/routes";
import { getLegalPage } from "@/server/site-pages";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What mybday.lol collects, what's public, and how to remove your listing.",
  alternates: { canonical: routes.privacy },
};

/** Privacy Policy. Read per request: the client edits the text in the admin, no deploy needed. */
export default async function PrivacyPage() {
  await connection();
  return <LegalPageView doc={await getLegalPage(db, "privacy")} current="privacy" />;
}
