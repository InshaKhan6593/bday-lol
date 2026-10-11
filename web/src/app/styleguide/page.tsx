import type { Metadata } from "next";
import { StyleGuide } from "./StyleGuide";

export const metadata: Metadata = {
  title: "Style guide",
  robots: { index: false, follow: false },
};

/** The design language. Live in production, but not linked from the site and kept out of search (noindex, robots.txt). */
export default function StyleGuidePage() {
  return <StyleGuide />;
}
