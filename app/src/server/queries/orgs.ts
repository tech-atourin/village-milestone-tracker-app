import "server-only";

import { createClient } from "@/lib/supabase/server";

export type OrgRow = {
  id: string;
  name: string;
  type: "atourin" | "mitra";
  logo_url: string | null;
  brand_color_primary: string | null;
  brand_color_secondary: string | null;
  project_count: number;
  user_count: number;
};

export async function listOrgsDetailed(): Promise<OrgRow[]> {
  const supabase = createClient();
  const { data: orgs } = await supabase
    .from("organizations")
    .select(
      "id, name, type, logo_url, brand_color_primary, brand_color_secondary",
    )
    .is("deleted_at", null)
    .order("name");
  const rows = (orgs ?? []) as Array<{
    id: string;
    name: string;
    type: "atourin" | "mitra";
    logo_url: string | null;
    brand_color_primary: string | null;
    brand_color_secondary: string | null;
  }>;
  const projCounts = new Map<string, number>();
  const userCounts = new Map<string, number>();
  if (rows.length) {
    const ids = rows.map((r) => r.id);
    const { data: projs } = await supabase
      .from("projects")
      .select("organization_id")
      .in("organization_id", ids)
      .is("deleted_at", null);
    for (const p of (projs ?? []) as Array<{ organization_id: string }>) {
      projCounts.set(
        p.organization_id,
        (projCounts.get(p.organization_id) ?? 0) + 1,
      );
    }
    const { data: usr } = await supabase
      .from("users")
      .select("organization_id")
      .in("organization_id", ids)
      .is("deleted_at", null);
    for (const u of (usr ?? []) as Array<{ organization_id: string | null }>) {
      if (!u.organization_id) continue;
      userCounts.set(
        u.organization_id,
        (userCounts.get(u.organization_id) ?? 0) + 1,
      );
    }
  }
  return rows.map((r) => ({
    ...r,
    project_count: projCounts.get(r.id) ?? 0,
    user_count: userCounts.get(r.id) ?? 0,
  }));
}
