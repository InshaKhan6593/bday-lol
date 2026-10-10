"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Every page opens at the top: after a link, the logo, Back, or a refresh
 * (handoff v2 §14). Next.js links already scroll up; Back and refresh need the
 * browser's own scroll memory turned off. A personal link is the exception: its
 * board marks the person's card with data-scroll-target and scrolls there itself.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }, []);

  useEffect(() => {
    if (document.querySelector("[data-scroll-target]")) return;
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
