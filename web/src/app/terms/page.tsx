import type { Metadata } from "next";
import { connection } from "next/server";
import { LegalPageView } from "@/components/legal/LegalPageView";
import { db } from "@/db";
import { routes } from "@/lib/routes";
import { getLegalPage } from "@/server/site-pages";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for bidding, boosting and listing birthdays on mybday.lol.",
  alternates: { canonical: routes.terms },
};

/** Terms of Service. Read per request: the client edits the text in the admin, no deploy needed. */
export default async function TermsPage() {
  await connection();
  return <LegalPageView doc={await getLegalPage(db, "terms")} current="terms" />;
}
