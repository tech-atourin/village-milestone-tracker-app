import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/types/supabase";

export type ProjectListRow = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  organization: { id: string; name: string } | null;
  template: { id: string; name: string } | null;
};

export async function listProjects(): Promise<ProjectListRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, name, description, status, period_start, period_end, created_at, organization:organizations(id,name), template:project_templates(id,name)",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listProjects error:", error);
    return [];
  }
  return (data ?? []) as unknown as ProjectListRow[];
}

export type ProjectDetail = ProjectListRow & {
  enabled_modules: Record<string, boolean>;
  total_pendampingan_days: number | null;
  topik_count: number;
  checklist_count: number;
  desa_count: number;
  member_count: number;
};

export async function getProject(id: string): Promise<ProjectDetail | null> {
  const supabase = createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "id, name, description, status, period_start, period_end, total_pendampingan_days, created_at, enabled_modules, organization:organizations(id,name), template:project_templates(id,name)",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !project) return null;

  const [{ count: topik }, { count: desa }, { count: members }] =
    await Promise.all([
      supabase
        .from("project_topik")
        .select("id", { count: "exact", head: true })
        .eq("project_id", id),
      supabase
        .from("project_desa")
        .select("id", { count: "exact", head: true })
        .eq("project_id", id),
      supabase
        .from("project_memberships")
        .select("id", { count: "exact", head: true })
        .eq("project_id", id)
        .eq("status", "active"),
    ]);

  // Count checklist items across all topik of this project.
  const { data: topikRows } = await supabase
    .from("project_topik")
    .select("id")
    .eq("project_id", id);
  const topikIds = (topikRows ?? []).map((t: { id: string }) => t.id);
  let checklist = 0;
  if (topikIds.length) {
    const { count } = await supabase
      .from("project_checklist_item")
      .select("id", { count: "exact", head: true })
      .in("project_topik_id", topikIds);
    checklist = count ?? 0;
  }

  return {
    ...(project as unknown as ProjectListRow),
    enabled_modules:
      (project as unknown as { enabled_modules: Record<string, boolean> })
        .enabled_modules ?? {},
    total_pendampingan_days:
      (project as unknown as { total_pendampingan_days: number | null })
        .total_pendampingan_days ?? null,
    topik_count: topik ?? 0,
    checklist_count: checklist,
    desa_count: desa ?? 0,
    member_count: members ?? 0,
  };
}

export type TemplateSummary = {
  id: string;
  name: string;
  description: string | null;
  default_modules: Record<string, boolean>;
  topik_count: number;
  checklist_count: number;
};

export async function listTemplates(): Promise<TemplateSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("project_templates")
    .select("id, name, description, default_modules")
    .order("name");
  if (error) return [];

  // Stats per template
  const results: TemplateSummary[] = [];
  for (const t of (data ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    default_modules: Record<string, boolean>;
  }>) {
    const { data: topiks } = await supabase
      .from("template_topik")
      .select("id")
      .eq("template_id", t.id);
    const topikIds = (topiks ?? []).map((x: { id: string }) => x.id);
    let checklist = 0;
    if (topikIds.length) {
      const { count } = await supabase
        .from("template_checklist_item")
        .select("id", { count: "exact", head: true })
        .in("template_topik_id", topikIds);
      checklist = count ?? 0;
    }
    results.push({
      ...t,
      topik_count: topikIds.length,
      checklist_count: checklist,
    });
  }
  return results;
}

export type OrganizationSummary = {
  id: string;
  name: string;
  type: "atourin" | "mitra";
};

export async function listOrganizations(): Promise<OrganizationSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, type")
    .is("deleted_at", null)
    .order("name");
  if (error) return [];
  return (data ?? []) as OrganizationSummary[];
}
