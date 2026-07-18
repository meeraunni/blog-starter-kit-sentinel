import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/thanks", "/unsubscribe"],
    },
    sitemap: "https://sentinelidentity.ca/sitemap.xml",
  };
}
