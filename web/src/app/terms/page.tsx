import type { Metadata } from "next";
import { connection } from "next/server";
import { LegalPageView } from "@/components/legal/LegalPageView";
import { db } from "@/db";
import { routes } from "@/lib/routes";
import { TERMS_DESCRIPTION, TERMS_TITLE, pageMetadata } from "@/lib/seo";
import { getLegalPage } from "@/server/site-pages";

export const metadata: Metadata = pageMetadata({ title: TERMS_TITLE, description: TERMS_DESCRIPTION, path: routes.terms });

/** Terms of Service. Read per request: the client edits the text in the admin, no deploy needed. */
export default async function TermsPage() {
  await connection();
  return <LegalPageView doc={await getLegalPage(db, "terms")} current="terms" />;
}
