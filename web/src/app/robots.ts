import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/routes";

/**
 * /robots.txt. Everything public is open to crawlers, AI search crawlers
 * included (claude-seo seo-technical: they decide whether ChatGPT, Claude and
 * Perplexity can cite the site). Claim, Success and Unsubscribe stay crawlable
 * on purpose: they carry noindex, and a crawler must be able to read it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/dev/", "/styleguide"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
