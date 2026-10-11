import type { Metadata } from "next";
import { LegalPageView } from "@/components/legal/LegalPageView";
import { db } from "@/db";
import { routes } from "@/lib/routes";
import { TERMS_DESCRIPTION, TERMS_TITLE, pageMetadata } from "@/lib/seo";
import { getLegalPage } from "@/server/site-pages";

export const metadata: Metadata = pageMetadata({ title: TERMS_TITLE, description: TERMS_DESCRIPTION, path: routes.terms });

// Cached and rebuilt at most every 5 minutes (claude-seo seo-technical: no-store on every page), so an edit
// shows within 5 minutes at the latest; the admin's save rebuilds the page at once.
export const revalidate = 300;

/** Terms of Service. The client edits the text in the admin, no deploy needed. */
export default async function TermsPage() {
  return <LegalPageView doc={await getLegalPage(db, "terms")} current="terms" />;
}
