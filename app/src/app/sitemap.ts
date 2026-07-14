import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/server";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vmt.atourin.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: 1.0 },
  ];
  // Include public dashboards (opt-in shareable link per project).
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("projects")
      .select("public_dashboard_slug, updated_at")
      .eq("public_dashboard_enabled", true)
      .not("public_dashboard_slug", "is", null);
    for (const r of (data ?? []) as Array<{
      public_dashboard_slug: string | null;
      updated_at: string | null;
    }>) {
      if (!r.public_dashboard_slug) continue;
      entries.push({
        url: `${BASE_URL}/public/${r.public_dashboard_slug}`,
        changeFrequency: "weekly",
        priority: 0.5,
        lastModified: r.updated_at ? new Date(r.updated_at) : undefined,
      });
    }
  } catch {
    // sitemap should never crash the build; skip on error
  }
  return entries;
}
