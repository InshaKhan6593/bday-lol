import type { Metadata } from "next";
import { connection } from "next/server";
import { HomeRoute, homeMetadata } from "@/components/home/HomeRoute";

/**
 * The homepage, drawn per request. Visitors normally get the saved copy instead: src/proxy.ts sends
 * "/" to /home/[date] (lib/day-cache.ts). This route only answers if that rewrite is ever missing.
 */
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  return homeMetadata(null);
}

export default async function HomePage() {
  await connection();
  return <HomeRoute day={null} />;
}
