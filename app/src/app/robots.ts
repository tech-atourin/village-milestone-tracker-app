import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vmt.atourin.com";

// Landing page + public dashboards ARE crawlable (for lead-gen SEO).
// Every authenticated scope + API is blocked.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/public/"],
      disallow: [
        "/atourin",
        "/mitra",
        "/peserta",
        "/narasumber",
        "/desa",
        "/login",
        "/forgot-password",
        "/profile",
        "/notifications",
        "/api",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
