import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MonthRoute, monthMetadata } from "@/components/month/MonthRoute";
import { parseSlug } from "@/lib/birthday";

type Props = { params: Promise<{ month: string }> };

/**
 * A month page. Its public URL is /october: next.config.ts rewrites the 12 month names here, so this
 * route can be cached while the date pages next to it (/october-7) stay per request.
 *
 * Cached and rebuilt at most once a minute, and right after a payment lands (the Stripe webhook
 * revalidates this route). The "Today" tag can lag midnight ET by that minute. Nothing is built ahead:
 * each month is rendered on its first visit, so the build needs no database.
 */
export const revalidate = 60;
export function generateStaticParams(): Array<{ month: string }> {
  return [];
}

const monthFromParam = (param: string) => {
  const parsed = parseSlug(param);
  return parsed?.kind === "month" ? parsed.month : null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const month = monthFromParam((await params).month);
  return month ? monthMetadata(month) : {};
}

export default async function MonthPage({ params }: Props) {
  const month = monthFromParam((await params).month);
  if (!month) notFound();
  return <MonthRoute month={month} />;
}
