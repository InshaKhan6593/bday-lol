import { notFound, permanentRedirect } from "next/navigation";
import { parseShortSlug, parseSlug, type MonthDay } from "@/lib/birthday";
import { routes } from "@/lib/routes";

/**
 * "/october-7" is a date page; "/oct-7" (the mockup's old share links)
 * redirects to it. Month pages ("/october") come with the SEO step.
 */
export function dateFromSlug(slug: string): MonthDay {
  const parsed = parseSlug(slug);
  if (parsed?.kind === "date") return parsed.md;
  const legacy = parsed ? null : parseShortSlug(slug);
  if (legacy) permanentRedirect(routes.date(legacy));
  notFound();
}
