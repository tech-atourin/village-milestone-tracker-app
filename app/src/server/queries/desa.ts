import "server-only";

import { createClient } from "@/lib/supabase/server";

export type DesaRow = {
  id: string;
  name: string;
  desa_kelurahan: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  provinsi: string | null;
  current_classification: string;
  created_at: string;
};

export async function listDesa(q?: string): Promise<DesaRow[]> {
  const supabase = createClient();
  let query = supabase
    .from("desa")
    .select(
      "id, name, desa_kelurahan, kecamatan, kabupaten, provinsi, current_classification, created_at",
    )
    .is("deleted_at", null)
    .order("name")
    .limit(500);

  if (q) {
    query = query.or(`name.ilike.%${q}%,kabupaten.ilike.%${q}%,provinsi.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) {
    console.error("listDesa error:", error);
    return [];
  }
  return (data ?? []) as unknown as DesaRow[];
}

export type ProjectDesaRow = {
  id: string;
  desa: DesaRow;
  classification_at_start: string | null;
  classification_target: string | null;
  coordinator: { id: string; full_name: string } | null;
  topik_summary: { topik_count: number; completed_count: number; avg_pct: number };
  peserta_count: number;
};

export async function listProjectDesa(
  projectId: string,
): Promise<ProjectDesaRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("project_desa")
    .select(
      `
      id, classification_at_start, classification_target,
      desa:desa(id, name, desa_kelurahan, kecamatan, kabupaten, provinsi, current_classification, created_at),
      coordinator:users(id, full_name)
    `,
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listProjectDesa error:", error);
    return [];
  }

  // Topik summary per desa (light query — could be a view later).
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    classification_at_start: string | null;
    classification_target: string | null;
    desa: DesaRow;
    coordinator: { id: string; full_name: string } | null;
  }>;

  const projectDesaIds = rows.map((r) => r.id);
  if (projectDesaIds.length === 0) return [];

  const { data: instances } = await supabase
    .from("desa_topik_instance")
    .select("id, project_desa_id, status, completion_percent")
    .in("project_desa_id", projectDesaIds);

  const summary = new Map<
    string,
    { topik_count: number; completed_count: number; sum_pct: number }
  >();
  for (const inst of (instances ?? []) as Array<{
    project_desa_id: string;
    status: string;
    completion_percent: number;
  }>) {
    const s = summary.get(inst.project_desa_id) ?? {
      topik_count: 0,
      completed_count: 0,
      sum_pct: 0,
    };
    s.topik_count += 1;
    if (inst.status === "completed") s.completed_count += 1;
    s.sum_pct += Number(inst.completion_percent) || 0;
    summary.set(inst.project_desa_id, s);
  }

  // Count peserta per desa within this project. 1 desa bisa punya banyak peserta.
  const desaIds = Array.from(new Set(rows.map((r) => r.desa.id)));
  const pesertaCount = new Map<string, number>();
  if (desaIds.length) {
    const { data: members } = await supabase
      .from("project_memberships")
      .select("desa_id")
      .eq("project_id", projectId)
      .eq("role", "peserta")
      .eq("status", "active")
      .in("desa_id", desaIds);
    for (const m of (members ?? []) as Array<{ desa_id: string }>) {
      pesertaCount.set(m.desa_id, (pesertaCount.get(m.desa_id) ?? 0) + 1);
    }
  }

  return rows.map((r) => {
    const s = summary.get(r.id);
    return {
      ...r,
      peserta_count: pesertaCount.get(r.desa.id) ?? 0,
      topik_summary: s
        ? {
            topik_count: s.topik_count,
            completed_count: s.completed_count,
            avg_pct: s.topik_count > 0 ? s.sum_pct / s.topik_count : 0,
          }
        : { topik_count: 0, completed_count: 0, avg_pct: 0 },
    };
  });
}

export async function getProjectDesa(
  projectId: string,
  projectDesaId: string,
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("project_desa")
    .select(
      `
      id, classification_at_start, classification_target,
      desa:desa(id, name, desa_kelurahan, kecamatan, kabupaten, provinsi, current_classification),
      coordinator:users(id, full_name, email),
      project:projects(id, name, status, organization:organizations(name))
    `,
    )
    .eq("id", projectDesaId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as {
    id: string;
    classification_at_start: string | null;
    classification_target: string | null;
    desa: DesaRow;
    coordinator: { id: string; full_name: string; email: string | null } | null;
    project: {
      id: string;
      name: string;
      status: string;
      organization: { name: string };
    };
  };
}
