import type { Metadata } from "next";
import { DesignOptions } from "./DesignOptions";

export const metadata: Metadata = {
  title: "Design options",
  robots: { index: false, follow: false },
};

/**
 * Where the build differs from the mockup, side by side, for the client to review. Live in production,
 * but not linked from the site and kept out of search (noindex, robots.txt). The developers' reference of
 * the design language is at /styleguide/reference (development only).
 */
export default function StyleGuidePage() {
  return <DesignOptions />;
}
