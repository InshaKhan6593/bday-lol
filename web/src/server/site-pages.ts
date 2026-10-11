import { eq } from "drizzle-orm";
import { PRIVACY_MARKDOWN, TERMS_MARKDOWN } from "@/content/legal";
import type { Executor } from "@/db";
import { sitePages } from "@/db/schema";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { faqToMarkdown, howItWorksFaq, parseFaqMarkdown, type Faq } from "@/lib/how-it-works";
import { parseLegalDoc, type LegalDoc } from "@/lib/legal";

/** Pages the client edits in the admin (handoff v2 §11): Terms, Privacy and the FAQ. */
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

/** Everything the admin can edit, with the text each starts from and where it shows. */
export const EDITABLE_PAGES = {
  terms: { title: "Terms of Service", path: "/terms" },
  privacy: { title: "Privacy Policy", path: "/privacy" },
  faq: { title: "FAQ", path: "/how-it-works" },
} as const;

export type EditablePageSlug = keyof typeof EDITABLE_PAGES;

export function isEditablePage(slug: unknown): slug is EditablePageSlug {
  // Own keys only: "__proto__" and friends are "in" every object.
  return typeof slug === "string" && Object.hasOwn(EDITABLE_PAGES, slug);
}

/** The text a page has before anyone edits it. The FAQ's amounts come from the board's rules. */
export function defaultPageBody(slug: EditablePageSlug): string {
  return slug === "faq" ? faqToMarkdown(howItWorksFaq(BIRTHDAY_BOARD_TYPE.settings)) : LEGAL_PAGES[slug].defaultBody;
}

/** A page's text for the admin's editor, and whether it has been edited. */
export async function getEditablePage(db: Executor, slug: EditablePageSlug): Promise<{ body: string; edited: boolean; updatedAt: string | null }> {
  const [row] = await db.select({ body: sitePages.body, updatedAt: sitePages.updatedAt }).from(sitePages).where(eq(sitePages.slug, slug)).limit(1);
  return { body: row?.body ?? defaultPageBody(slug), edited: Boolean(row), updatedAt: row?.updatedAt.toISOString() ?? null };
}

/** The questions on How it works: the admin's version, or the original 10 until one is saved. */
export async function getFaq(db: Executor): Promise<Faq[]> {
  const [row] = await db.select({ body: sitePages.body }).from(sitePages).where(eq(sitePages.slug, "faq")).limit(1);
  const saved = row ? parseFaqMarkdown(row.body) : [];
  return saved.length ? saved : howItWorksFaq(BIRTHDAY_BOARD_TYPE.settings);
}

/** What stops a page from being saved, or null. A page that would come out empty is never saved. */
export function pageBodyError(slug: EditablePageSlug, body: string): string | null {
  if (!body.trim()) return "The page can’t be empty.";
  if (body.length > 200_000) return "That’s too long to save.";
  if (slug === "faq" && parseFaqMarkdown(body).length === 0) return "Add at least one question: a line starting with “## ”, then its answer.";
  if (slug !== "faq" && parseLegalDoc(body, LEGAL_PAGES[slug].title).sections.length === 0) return "Add at least one section.";
  return null;
}

/** Back to the original text: the saved version is deleted. */
export async function resetSitePage(db: Executor, slug: EditablePageSlug): Promise<void> {
  await db.delete(sitePages).where(eq(sitePages.slug, slug));
}

/** Saves an edited page (used by the admin). */
export async function saveSitePage(db: Executor, slug: EditablePageSlug, body: string, instant: Date): Promise<void> {
  await db
    .insert(sitePages)
    .values({ slug, body, updatedAt: instant })
    .onConflictDoUpdate({ target: sitePages.slug, set: { body, updatedAt: instant } });
}

/** When the admin last saved each editable page (missing: still the original text). Sitemap lastmod. */
export async function getSitePagesUpdatedAt(db: Executor): Promise<Partial<Record<LegalPageSlug, Date>>> {
  const rows = await db.select({ slug: sitePages.slug, updatedAt: sitePages.updatedAt }).from(sitePages);
  return Object.fromEntries(rows.filter((r) => r.slug in LEGAL_PAGES).map((r) => [r.slug, r.updatedAt]));
}
