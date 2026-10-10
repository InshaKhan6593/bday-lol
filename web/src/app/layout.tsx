import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { ScrollToTop } from "@/components/site/ScrollToTop";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "mybday.lol", template: "%s | mybday.lol" },
  description: "Bid on your birthday. The highest bid owns the homepage.",
  applicationName: "mybday.lol",
  // Defaults for pages without their own (Claim, Success…); public pages set theirs through pageMetadata.
  openGraph: { siteName: "mybday.lol", type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image" },
  // Google Search Console's "HTML tag" verification (06-seo.md): paste the code into the env, no deploy of code needed.
  ...(process.env.GOOGLE_SITE_VERIFICATION && { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={bricolage.variable}>
      <body>
        <ScrollToTop />
        {children}
      </body>
    </html>
  );
}
