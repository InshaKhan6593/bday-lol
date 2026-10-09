"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-reads the page's server data every `ms` while mounted (e.g. until a Stripe webhook lands). */
export function AutoRefresh({ ms = 1_500 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), ms);
    return () => clearInterval(id);
  }, [router, ms]);
  return null;
}
