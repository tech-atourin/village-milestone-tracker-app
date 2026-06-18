import type { MetadataRoute } from "next";

// =====================================================
// Private deployment - block all search engine indexing.
// VMT is internal Atourin use only.
// Shareable dashboard URLs are still accessible by direct
// link, just not discoverable via search.
// =====================================================
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
