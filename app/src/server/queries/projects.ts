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
  pelatihan_start: string | null;
  pelatihan_end: string | null;
  total_pelatihan_days: number | null;
  pendampingan_start: string | null;
  pendampingan_end: string | null;
  enabled_modules: Record<string, boolean>;
  total_pendampingan_days: number | null;
  program_type: "desa_based" | "pelaku_pariwisata";
  participant_mode: "offline" | "online" | "both";
  target_online: number;
  target_offline: number;
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
      "id, name, description, status, period_start, period_end, pelatihan_start, pelatihan_end, total_pelatihan_days, pendampingan_start, pendampingan_end, total_pendampingan_days, program_type, participant_mode, target_online, target_offline, created_at, enabled_modules, organization:organizations(id,name), template:project_templates(id,name)",
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
    pelatihan_start:
      (project as unknown as { pelatihan_start: string | null })
        .pelatihan_start ?? null,
    pelatihan_end:
      (project as unknown as { pelatihan_end: string | null })
        .pelatihan_end ?? null,
    total_pelatihan_days:
      (project as unknown as { total_pelatihan_days: number | null })
        .total_pelatihan_days ?? null,
    pendampingan_start:
      (project as unknown as { pendampingan_start: string | null })
        .pendampingan_start ?? null,
    pendampingan_end:
      (project as unknown as { pendampingan_end: string | null })
        .pendampingan_end ?? null,
    program_type:
      ((project as unknown as { program_type?: string }).program_type ??
        "desa_based") as "desa_based" | "pelaku_pariwisata",
    participant_mode:
      ((project as unknown as { participant_mode?: string }).participant_mode ??
        "offline") as "offline" | "online" | "both",
    target_online:
      (project as unknown as { target_online?: number }).target_online ?? 0,
    target_offline:
      (project as unknown as { target_offline?: number }).target_offline ?? 0,
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
