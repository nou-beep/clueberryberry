import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * The editor, the account flows and the API are not for crawlers. Everything
 * a player can browse is.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/en/editor", "/fr/editor", "/ar/editor", "/en/account", "/fr/account", "/ar/account"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
