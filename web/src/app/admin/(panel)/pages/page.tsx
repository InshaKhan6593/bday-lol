import { PagesScreen, type EditablePage } from "@/components/admin/PagesScreen";
import { db } from "@/db";
import { requireAdmin } from "@/server/admin-session";
import { EDITABLE_PAGES, getEditablePage, isEditablePage, type EditablePageSlug } from "@/server/site-pages";

type Props = { searchParams: Promise<{ page?: string }> };

/** /admin/pages: the text of Terms, Privacy and the FAQ. */
export default async function AdminPagesPage({ searchParams }: Props) {
  await requireAdmin();
  const asked = (await searchParams).page;
  const pages: EditablePage[] = await Promise.all(
    (Object.keys(EDITABLE_PAGES) as EditablePageSlug[]).map(async (slug) => {
      const { body, edited } = await getEditablePage(db, slug);
      return { slug, title: EDITABLE_PAGES[slug].title, path: EDITABLE_PAGES[slug].path, body, edited };
    }),
  );
  return <PagesScreen pages={pages} current={isEditablePage(asked) ? asked : "terms"} />;
}
