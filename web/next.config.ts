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

const nextConfig: NextConfig = {
  typedRoutes: true,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // The share images and icon read the font files at run time: ship them with those functions.
  outputFileTracingIncludes: {
    "/**/*": ["./src/assets/fonts/*.ttf"],
  },
};

export default nextConfig;
