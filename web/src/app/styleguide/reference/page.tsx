import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StyleGuide } from "../StyleGuide";

export const metadata: Metadata = {
  title: "Design language",
  robots: { index: false, follow: false },
};

/** Development-only reference of the design language (themes, type, buttons, surfaces, fields, icons). */
export default function StyleGuideReferencePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StyleGuide />;
}
