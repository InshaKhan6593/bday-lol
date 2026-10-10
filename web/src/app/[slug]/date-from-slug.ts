import { notFound, permanentRedirect } from "next/navigation";
import { parseShortSlug, parseSlug, type MonthDay, type ParsedSlug } from "@/lib/birthday";
import { routes } from "@/lib/routes";

/**
 * "/october-7" is a date page and "/october" a month page; "/oct-7" (the
 * mockup's old share links) redirects to the date page. Anything else is a 404.
 */
export function pageFromSlug(slug: string): ParsedSlug {
  const parsed = parseSlug(slug);
  if (parsed) return parsed;
  const legacy = parseShortSlug(slug);
  if (legacy) permanentRedirect(routes.date(legacy));
  notFound();
}

/** Same, for routes under a date (/october-7/sam-rivera): a month there is a 404. */
export function dateFromSlug(slug: string): MonthDay {
  const page = pageFromSlug(slug);
  if (page.kind !== "date") notFound();
  return page.md;
}
