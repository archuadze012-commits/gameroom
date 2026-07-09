import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private / non-content surfaces — keep them out of the index.
      disallow: ["/api/", "/admin", "/messages", "/settings", "/auth/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
