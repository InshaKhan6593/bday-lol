import type { Metadata } from "next";
import { connection } from "next/server";
import { LegalPageView } from "@/components/legal/LegalPageView";
import { db } from "@/db";
import { routes } from "@/lib/routes";
import { PRIVACY_DESCRIPTION, PRIVACY_TITLE, pageMetadata } from "@/lib/seo";
import { getLegalPage } from "@/server/site-pages";

export const metadata: Metadata = pageMetadata({ title: PRIVACY_TITLE, description: PRIVACY_DESCRIPTION, path: routes.privacy });

/** Privacy Policy. Read per request: the client edits the text in the admin, no deploy needed. */
export default async function PrivacyPage() {
  await connection();
  return <LegalPageView doc={await getLegalPage(db, "privacy")} current="privacy" />;
}
