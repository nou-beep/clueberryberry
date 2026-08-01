/**
 * One place that knows where this deployment lives.
 *
 * Vercel sets `VERCEL_PROJECT_PRODUCTION_URL` on every deployment, so previews
 * and production both resolve to something real without configuration. An
 * explicit `NEXT_PUBLIC_APP_URL` always wins, because a custom domain is the
 * canonical one for metadata and email links.
 */
export const siteUrl: string = (
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.AUTH_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const LOCALES = ["en", "fr", "ar"] as const;
