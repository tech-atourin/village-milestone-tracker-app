import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export type ReviewQueueItem = {
  checklist_progress_id: string;
  status: "submitted" | "approved" | "rejected" | "not_started";
  submitted_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  checklist_item: { id: string; title: string; description: string | null };
  topik: { id: string; name: string };
  desa: { id: string; name: string };
  project_desa_id: string;
  submitted_by: { id: string; full_name: string } | null;
  evidence_count: number;
};

export async function listReviewQueue(
  projectId: string,
  statusFilter: "submitted" | "all" = "submitted",
): Promise<ReviewQueueItem[]> {
  // checklist_progress RLS policies only resolve for desa_wisata via auth.uid;
  // staff (superadmin/mitra/narasumber) need admin client. Callers gate role.
  const supabase = createAdminClient();

  // Two-hop: project_desa → desa_topik_instance → checklist_progress
  // Pull everything joined in one go.
  let query = supabase
    .from("checklist_progress")
    .select(
      `
      id, status, submitted_at, reviewed_at, review_note,
      project_checklist_item:project_checklist_item(id, title, description),
      desa_topik_instance:desa_topik_instance(
        id,
        project_topik:project_topik(id, name),
        project_desa:project_desa!inner(id, project_id, desa:desa(id, name))
      ),
      submitted_by:users(id, full_name)
    `,
    )
    .eq("desa_topik_instance.project_desa.project_id", projectId)
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (statusFilter === "submitted") {
    query = query.eq("status", "submitted");
  }

  const { data, error } = await query;
  if (error) {
    console.error("listReviewQueue:", error);
    return [];
  }

  // Evidence count per checklist_progress
  const cpIds = (data ?? []).map((r: { id: string }) => r.id);
  const counts = new Map<string, number>();
  if (cpIds.length) {
    const { data: tags } = await supabase
      .from("evidence_tags")
      .select("tag_target_id")
      .eq("tag_type", "checklist_progress")
      .in("tag_target_id", cpIds);
    for (const t of (tags ?? []) as Array<{ tag_target_id: string }>) {
      counts.set(t.tag_target_id, (counts.get(t.tag_target_id) ?? 0) + 1);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    checklist_progress_id: r.id,
    status: r.status,
    submitted_at: r.submitted_at,
    reviewed_at: r.reviewed_at,
    review_note: r.review_note,
    checklist_item: {
      id: r.project_checklist_item?.id,
      title: r.project_checklist_item?.title,
      description: r.project_checklist_item?.description,
    },
    topik: {
      id: r.desa_topik_instance?.project_topik?.id,
      name: r.desa_topik_instance?.project_topik?.name,
    },
    desa: {
      id: r.desa_topik_instance?.project_desa?.desa?.id,
      name: r.desa_topik_instance?.project_desa?.desa?.name,
    },
    project_desa_id: r.desa_topik_instance?.project_desa?.id,
    submitted_by: r.submitted_by
      ? { id: r.submitted_by.id, full_name: r.submitted_by.full_name }
      : null,
    evidence_count: counts.get(r.id) ?? 0,
  }));
}

// =====================================================
// listTopikReviewForDesa - per-topik checklist + progress + evidence
// for ONE project_desa. Powers the inline reviewer in Detail Desa.
// =====================================================
export type TopikReviewItem = {
  checklist_item_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  checklist_progress_id: string | null;
  status: "not_started" | "submitted" | "approved" | "rejected";
  submitted_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  submitted_by: { id: string; full_name: string } | null;
  evidence_files: Array<{
    id: string;
    file_url: string;
    file_type: string | null;
    original_filename: string | null;
  }>;
};

export type TopikReviewGroup = {
  desa_topik_instance_id: string;
  project_topik_id: string;
  topik_name: string;
  sort_order: number;
  completion_percent: number;
  approved_count: number;
  pending_count: number;
  total_count: number;
  items: TopikReviewItem[];
};

export async function listTopikReviewForDesa(
  projectDesaId: string,
): Promise<TopikReviewGroup[]> {
  const supabase = createAdminClient();

  // Topiks + their items for the project this project_desa belongs to.
  const { data: pdRow } = await supabase
    .from("project_desa")
    .select("project_id")
    .eq("id", projectDesaId)
    .maybeSingle();
  if (!pdRow) return [];
  const projectId = (pdRow as { project_id: string }).project_id;

  const { data: topikRows } = await supabase
    .from("project_topik")
    .select("id, name, sort_order")
    .eq("project_id", projectId)
    .order("sort_order");

  const topiks = ((topikRows ?? []) as Array<{
    id: string;
    name: string;
    sort_order: number;
  }>);
  if (topiks.length === 0) return [];

  const topikIds = topiks.map((t) => t.id);
  const { data: itemRows } = await supabase
    .from("project_checklist_item")
    .select("id, project_topik_id, title, description, sort_order")
    .in("project_topik_id", topikIds)
    .order("sort_order");

  const itemsByTopik = new Map<
    string,
    Array<{
      id: string;
      title: string;
      description: string | null;
      sort_order: number;
    }>
  >();
  for (const it of (itemRows ?? []) as Array<{
    id: string;
    project_topik_id: string;
    title: string;
    description: string | null;
    sort_order: number;
  }>) {
    const arr = itemsByTopik.get(it.project_topik_id) ?? [];
    arr.push({
      id: it.id,
      title: it.title,
      description: it.description,
      sort_order: it.sort_order,
    });
    itemsByTopik.set(it.project_topik_id, arr);
  }

  // Desa topik instances for this desa.
  const { data: instRows } = await supabase
    .from("desa_topik_instance")
    .select("id, project_topik_id, completion_percent")
    .eq("project_desa_id", projectDesaId);
  const instByTopik = new Map<
    string,
    { id: string; completion_percent: number }
  >();
  for (const i of (instRows ?? []) as Array<{
    id: string;
    project_topik_id: string;
    completion_percent: number | string;
  }>) {
    instByTopik.set(i.project_topik_id, {
      id: i.id,
      completion_percent: Number(i.completion_percent) || 0,
    });
  }

  const instanceIds = Array.from(instByTopik.values()).map((i) => i.id);

  // Checklist progress rows for these instances.
  const { data: cpRows } = instanceIds.length
    ? await supabase
        .from("checklist_progress")
        .select(
          "id, desa_topik_instance_id, project_checklist_item_id, status, submitted_at, reviewed_at, review_note, submitted_by:users!checklist_progress_submitted_by_fkey(id, full_name)",
        )
        .in("desa_topik_instance_id", instanceIds)
    : { data: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cpRowsAny = (cpRows ?? []) as any[];
  const cpByItem = new Map<string, (typeof cpRowsAny)[number]>();
  for (const cp of cpRowsAny) {
    cpByItem.set(cp.project_checklist_item_id, cp);
  }
  const cpIds = cpRowsAny.map((r) => r.id);

  // Evidence files tagged to these checklist_progress rows.
  const evidenceByCp = new Map<
    string,
    Array<{
      id: string;
      file_url: string;
      file_type: string | null;
      original_filename: string | null;
    }>
  >();
  if (cpIds.length) {
    const { data: tagRows } = await supabase
      .from("evidence_tags")
      .select(
        "tag_target_id, evidence:evidence_files(id, file_url, file_type, original_filename)",
      )
      .eq("tag_type", "checklist_progress")
      .in("tag_target_id", cpIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const t of (tagRows ?? []) as any[]) {
      if (!t.evidence) continue;
      const arr = evidenceByCp.get(t.tag_target_id) ?? [];
      arr.push({
        id: t.evidence.id,
        file_url: t.evidence.file_url,
        file_type: t.evidence.file_type ?? null,
        original_filename: t.evidence.original_filename ?? null,
      });
      evidenceByCp.set(t.tag_target_id, arr);
    }
  }

  return topiks.map((t) => {
    const inst = instByTopik.get(t.id);
    const items: TopikReviewItem[] = (itemsByTopik.get(t.id) ?? []).map(
      (it) => {
        const cp = cpByItem.get(it.id);
        return {
          checklist_item_id: it.id,
          title: it.title,
          description: it.description,
          sort_order: it.sort_order,
          checklist_progress_id: cp?.id ?? null,
          status: (cp?.status ?? "not_started") as TopikReviewItem["status"],
          submitted_at: cp?.submitted_at ?? null,
          reviewed_at: cp?.reviewed_at ?? null,
          review_note: cp?.review_note ?? null,
          submitted_by: cp?.submitted_by
            ? {
                id: cp.submitted_by.id as string,
                full_name: cp.submitted_by.full_name as string,
              }
            : null,
          evidence_files: cp ? evidenceByCp.get(cp.id) ?? [] : [],
        };
      },
    );
    const approved = items.filter((i) => i.status === "approved").length;
    const pending = items.filter((i) => i.status === "submitted").length;
    return {
      desa_topik_instance_id: inst?.id ?? "",
      project_topik_id: t.id,
      topik_name: t.name,
      sort_order: t.sort_order,
      completion_percent: inst?.completion_percent ?? 0,
      approved_count: approved,
      pending_count: pending,
      total_count: items.length,
      items,
    };
  });
}
