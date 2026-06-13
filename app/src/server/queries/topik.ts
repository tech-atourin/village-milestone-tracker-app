import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ProjectTopikRow = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  checklist_count: number;
};

export async function listProjectTopik(
  projectId: string,
): Promise<ProjectTopikRow[]> {
  const supabase = createClient();
  const { data: topik } = await supabase
    .from("project_topik")
    .select("id, name, description, sort_order")
    .eq("project_id", projectId)
    .order("sort_order");
  const rows = (topik ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    sort_order: number;
  }>;
  if (rows.length === 0) return [];

  // Count checklist items per topik
  const { data: items } = await supabase
    .from("project_checklist_item")
    .select("id, project_topik_id")
    .in(
      "project_topik_id",
      rows.map((r) => r.id),
    );
  const counts = new Map<string, number>();
  for (const i of (items ?? []) as Array<{ project_topik_id: string }>) {
    counts.set(i.project_topik_id, (counts.get(i.project_topik_id) ?? 0) + 1);
  }
  return rows.map((r) => ({
    ...r,
    checklist_count: counts.get(r.id) ?? 0,
  }));
}

export type ProjectTopikWithItems = ProjectTopikRow & {
  items: Array<{
    id: string;
    title: string;
    description: string | null;
    required: boolean;
    sort_order: number;
  }>;
};

export async function listProjectTopikWithItems(
  projectId: string,
): Promise<ProjectTopikWithItems[]> {
  const supabase = createClient();
  const topik = await listProjectTopik(projectId);
  if (topik.length === 0) return [];
  const { data: items } = await supabase
    .from("project_checklist_item")
    .select("id, project_topik_id, title, description, required, sort_order")
    .in(
      "project_topik_id",
      topik.map((t) => t.id),
    )
    .order("sort_order");
  const byTopik = new Map<
    string,
    Array<{
      id: string;
      title: string;
      description: string | null;
      required: boolean;
      sort_order: number;
    }>
  >();
  for (const it of (items ?? []) as Array<{
    id: string;
    project_topik_id: string;
    title: string;
    description: string | null;
    required: boolean;
    sort_order: number;
  }>) {
    const arr = byTopik.get(it.project_topik_id) ?? [];
    arr.push(it);
    byTopik.set(it.project_topik_id, arr);
  }
  return topik.map((t) => ({ ...t, items: byTopik.get(t.id) ?? [] }));
}
