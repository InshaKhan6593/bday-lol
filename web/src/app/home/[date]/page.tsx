import type { Metadata } from "next";
import { HomeRoute, homeMetadata } from "@/components/home/HomeRoute";

type Props = { params: Promise<{ date: string }> };

/**
 * The homepage's saved copy for one Eastern day. Its public URL is "/": src/proxy.ts adds today's
 * date on every request (lib/day-cache.ts), so the copy changes at midnight ET by itself.
 *
 * Thrown away the moment a payment lands (the Stripe webhook revalidates this route) and rebuilt at
 * most every 5 minutes otherwise. Nothing is built ahead, so the build needs no database for it.
 */
export const revalidate = 300;
export function generateStaticParams(): Array<{ date: string }> {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return homeMetadata((await params).date);
}

export default async function SavedHomePage({ params }: Props) {
  return <HomeRoute day={(await params).date} />;
}
