import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export type ActionPlanRow = {
  id: string;
  project_id: string;
  project_name: string;
  project_desa_id: string;
  desa_name: string;
  timeframe: "jangka_pendek" | "jangka_menengah" | "jangka_panjang";
  title: string;
  description: string | null;
  pihak_terlibat: string | null;
  output_target: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "rencana" | "on_track" | "selesai" | "ditunda";
  evidence_path: string | null;
  created_by: string;
  creator_name: string;
  created_at: string;
};

export async function listActionPlans(opts: {
  projectId?: string;
  projectDesaId?: string;
  desaId?: string;
}): Promise<ActionPlanRow[]> {
  const supabase = createAdminClient();
  let q = supabase
    .from("desa_action_plans")
    .select(
      `id, project_id, project_desa_id, timeframe, title, description, pihak_terlibat,
       output_target, start_date, end_date, status, evidence_path, created_by, created_at,
       project:projects(name),
       project_desa:project_desa(desa:desa(name)),
       creator:users!desa_action_plans_created_by_fkey(full_name)`,
    )
    .order("created_at", { ascending: false });

  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  if (opts.projectDesaId) q = q.eq("project_desa_id", opts.projectDesaId);

  const { data } = await q;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows = ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    project_id: r.project_id,
    project_name: r.project?.name ?? "-",
    project_desa_id: r.project_desa_id,
    desa_name: r.project_desa?.desa?.name ?? "-",
    timeframe: r.timeframe,
    title: r.title,
    description: r.description,
    pihak_terlibat: r.pihak_terlibat,
    output_target: r.output_target,
    start_date: r.start_date,
    end_date: r.end_date,
    status: r.status,
    evidence_path: r.evidence_path,
    created_by: r.created_by,
    creator_name: r.creator?.full_name ?? "-",
    created_at: r.created_at,
  })) as ActionPlanRow[];

  if (opts.desaId) {
    // post-filter by desa
    const supabase2 = createAdminClient();
    const { data: pds } = await supabase2
      .from("project_desa")
      .select("id")
      .eq("desa_id", opts.desaId);
    const pdIds = new Set(
      (pds ?? []).map((r) => (r as { id: string }).id),
    );
    rows = rows.filter((r) => pdIds.has(r.project_desa_id));
  }
  return rows;
}
