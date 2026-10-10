import { eq } from "drizzle-orm";
import { PRIVACY_MARKDOWN, TERMS_MARKDOWN } from "@/content/legal";
import type { Executor } from "@/db";
import { sitePages } from "@/db/schema";
import { parseLegalDoc, type LegalDoc } from "@/lib/legal";

/** Pages the client edits in the admin (handoff v2 §11). The FAQ joins them with the admin step. */
export const LEGAL_PAGES = {
  terms: { title: "Terms of Service", defaultBody: TERMS_MARKDOWN },
  privacy: { title: "Privacy Policy", defaultBody: PRIVACY_MARKDOWN },
} as const;

export type LegalPageSlug = keyof typeof LEGAL_PAGES;

/** The page's current text: the admin's saved version, or the client's original text until one is saved. */
export async function getLegalPage(db: Executor, slug: LegalPageSlug): Promise<LegalDoc> {
  const [row] = await db.select({ body: sitePages.body }).from(sitePages).where(eq(sitePages.slug, slug)).limit(1);
  const page = LEGAL_PAGES[slug];
  return parseLegalDoc(row?.body ?? page.defaultBody, page.title);
}

/** Saves an edited page (used by the admin). */
export async function saveSitePage(db: Executor, slug: LegalPageSlug, body: string, instant: Date): Promise<void> {
  await db
    .insert(sitePages)
    .values({ slug, body, updatedAt: instant })
    .onConflictDoUpdate({ target: sitePages.slug, set: { body, updatedAt: instant } });
}
