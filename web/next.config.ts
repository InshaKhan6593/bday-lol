import type { NextConfig } from "next";

/**
 * Sent with every response (claude-seo seo-technical §3). The site is never
 * framed (Stripe Checkout is a redirect, not an iframe), so framing is denied.
 * HTTPS and HSTS come from Vercel on the live domain.
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** The 12 month pages (/october). They share a URL shape with the date pages (/october-7) but not a route. */
const MONTH_NAMES = "january|february|march|april|may|june|july|august|september|october|november|december";
const SHORT_MONTH_NAMES = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";
const MONTH = `:month(${MONTH_NAMES})`;
/** The Eastern day in a saved page's address (src/lib/day-cache.ts): 2026-10-11. */
const DAY = ":date(\\d{4}-\\d{2}-\\d{2})";

const nextConfig: NextConfig = {
  typedRoutes: true,
  poweredByHeader: false,
  // /october is served by the cached /months/[month] route; the date pages' [slug] route renders per request,
  // and one route can't do both.
  async rewrites() {
    return [
      { source: `/${MONTH}`, destination: `/months/${MONTH}` },
      // A one-part URL that can't be a month, a date or an old short link (/oct-7) never reaches [slug]:
      // a 404 thrown from inside a route is only drawn in the browser, this one is in the HTML.
      { source: `/:slug((?!(?:${MONTH_NAMES}|${SHORT_MONTH_NAMES})(?:-[1-9]\\d?)?$)[^/]+)`, destination: "/_not-found" },
    ];
  },
  // The internal path is not a second URL for the same page.
  async redirects() {
    return [
      { source: `/months/${MONTH}`, destination: `/${MONTH}`, permanent: true },
      // The saved copies of the homepage and date pages (src/lib/day-cache.ts).
      // Only the shapes the proxy writes are sent back: nothing else is ever copied into a redirect.
      { source: `/home/${DAY}`, destination: "/", permanent: true },
      { source: `/:slug((?:${MONTH_NAMES})-[1-9]\\d?)/~day/${DAY}`, destination: "/:slug", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // The share images and icon read the font files at run time: ship them with those functions.
  outputFileTracingIncludes: {
    "/**/*": ["./src/assets/fonts/*.ttf"],
  },
};

export default nextConfig;
