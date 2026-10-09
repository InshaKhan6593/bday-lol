import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StyleGuide } from "./StyleGuide";

export const metadata: Metadata = {
  title: "Style guide",
  robots: { index: false, follow: false },
};

/** Development-only reference of the design language. */
export default function StyleGuidePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StyleGuide />;
}
