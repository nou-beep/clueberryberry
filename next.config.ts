import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Headers applied to every response.
 *
 * There is deliberately no Content-Security-Policy here: the app inlines a
 * small theme-boot script in `layout.tsx` to avoid a flash of the wrong theme,
 * and a CSP strict enough to be worth having would need a nonce threaded
 * through it. That is a revisitable trade — see DEPLOYMENT.md.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app never asks for any of these.
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Running `next build` against the same directory a `next dev` server is
  // serving from corrupts that server's chunks. Setting NEXT_DIST_DIR lets a
  // build run alongside a live dev server; deployments leave it unset.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // A type or lint error should fail the build rather than ship.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
