import "server-only";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export type ProjectResource = {
  id: string;
  project_id: string;
  kind: "file" | "link";
  title: string;
  description: string | null;
  category: string | null;
  file_url: string | null;
  file_type: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  original_filename: string | null;
  url: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
};

// Admin/staff view: every row for the project, newest first.
export async function listProjectResources(
  projectId: string,
): Promise<ProjectResource[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("project_resources")
    .select(
      "id, project_id, kind, title, description, category, file_url, file_type, mime_type, file_size_bytes, original_filename, url, sort_order, is_published, created_at",
    )
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  return (data as ProjectResource[] | null) ?? [];
}

export type PesertaResourceGroup = {
  project_id: string;
  project_name: string;
  items: ProjectResource[];
};

// Peserta view: published resources across every project the signed-in user is
// an active member of, grouped by project. Read via RLS (member-scoped policy).
export async function getPesertaResources(
  userId: string,
): Promise<PesertaResourceGroup[]> {
  const supabase = createClient();

  // Projects the peserta actively belongs to.
  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from("project_memberships")
    .select("project_id, project:projects(id, name)")
    .eq("user_id", userId)
    .eq("status", "active");

  const projects = new Map<string, string>();
  for (const m of (memberships as
    | { project_id: string; project: { id: string; name: string } | null }[]
    | null) ?? []) {
    if (m.project?.name) projects.set(m.project_id, m.project.name);
  }
  if (projects.size === 0) return [];

  const { data } = await supabase
    .from("project_resources")
    .select(
      "id, project_id, kind, title, description, category, file_url, file_type, mime_type, file_size_bytes, original_filename, url, sort_order, is_published, created_at",
    )
    .in("project_id", Array.from(projects.keys()))
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const rows = (data as ProjectResource[] | null) ?? [];
  const groups: PesertaResourceGroup[] = [];
  for (const [projectId, projectName] of Array.from(projects.entries())) {
    const items = rows.filter((r) => r.project_id === projectId);
    if (items.length > 0)
      groups.push({ project_id: projectId, project_name: projectName, items });
  }
  return groups;
}
