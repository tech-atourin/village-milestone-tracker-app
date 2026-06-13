import "server-only";

import { createClient } from "@/lib/supabase/server";

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
  const supabase = createClient();

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
