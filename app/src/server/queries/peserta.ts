import "server-only";

import { createClient } from "@/lib/supabase/server";

// =====================================================
// Active project_desa rows the peserta represents.
// =====================================================
export type PesertaProjectDesa = {
  membership_id: string;
  project_desa_id: string;
  project: { id: string; name: string; status: string };
  desa: { id: string; name: string; kabupaten: string | null; provinsi: string | null };
  progress: { overall_pct: number; total_items: number; approved_items: number };
};

export async function listPesertaProjectDesa(
  userId: string,
): Promise<PesertaProjectDesa[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("project_memberships")
    .select(
      `
      id, project_id, desa_id,
      project:projects(id, name, status),
      desa:desa(id, name, kabupaten, provinsi)
    `,
    )
    .eq("user_id", userId)
    .eq("role", "peserta")
    .eq("status", "active")
    .not("desa_id", "is", null);

  if (error) {
    console.error("listPesertaProjectDesa:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    project_id: string;
    desa_id: string;
    project: { id: string; name: string; status: string };
    desa: {
      id: string;
      name: string;
      kabupaten: string | null;
      provinsi: string | null;
    };
  }>;

  // For each membership, find the project_desa.id
  const results: PesertaProjectDesa[] = [];
  for (const r of rows) {
    const { data: pd } = await supabase
      .from("project_desa")
      .select("id")
      .eq("project_id", r.project_id)
      .eq("desa_id", r.desa_id)
      .maybeSingle();
    if (!pd) continue;
    const projectDesaId = (pd as { id: string }).id;

    // Pull instances + counts for progress
    const { data: instances } = await supabase
      .from("desa_topik_instance")
      .select("id, completion_percent")
      .eq("project_desa_id", projectDesaId);

    let sumPct = 0;
    for (const inst of (instances ?? []) as Array<{ completion_percent: number }>) {
      sumPct += Number(inst.completion_percent) || 0;
    }
    const overall =
      (instances?.length ?? 0) > 0 ? sumPct / (instances?.length ?? 1) : 0;

    // Counts for header strip
    const { count: totalItems } = await supabase
      .from("checklist_progress")
      .select("id", { count: "exact", head: true })
      .in(
        "desa_topik_instance_id",
        (instances ?? []).map((i: { id: string }) => i.id),
      );
    const { count: approvedItems } = await supabase
      .from("checklist_progress")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .in(
        "desa_topik_instance_id",
        (instances ?? []).map((i: { id: string }) => i.id),
      );

    results.push({
      membership_id: r.id,
      project_desa_id: projectDesaId,
      project: r.project,
      desa: r.desa,
      progress: {
        overall_pct: overall,
        total_items: totalItems ?? 0,
        approved_items: approvedItems ?? 0,
      },
    });
  }
  return results;
}

// =====================================================
// Topik + checklist progress for a specific project_desa.
// Used in peserta topik list and atourin desa-detail.
// =====================================================
export type PesertaTopikRow = {
  desa_topik_instance_id: string;
  project_topik_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  status: "not_started" | "in_progress" | "completed" | "needs_revision";
  completion_percent: number;
  total_items: number;
  approved_items: number;
  pending_items: number;
  unanswered_review_count: number;
};

const REVIEWER_ROLES = new Set([
  "superadmin",
  "mitra_admin",
  "narasumber",
]);

// Returns Set<checklist_progress_id> where the latest discussion comment
// was posted by a reviewer (i.e. peserta/desa has not replied yet).
async function getUnansweredCpIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  cpIds: string[],
): Promise<Set<string>> {
  if (cpIds.length === 0) return new Set();
  const { data } = await supabase
    .from("assessment_comments")
    .select("target_id, author_role, created_at")
    .eq("target_type", "checklist_progress")
    .in("target_id", cpIds)
    .order("created_at", { ascending: true });
  // Track the latest author_role per cp
  const latest = new Map<string, string>();
  for (const r of (data ?? []) as Array<{
    target_id: string;
    author_role: string;
  }>) {
    latest.set(r.target_id, r.author_role);
  }
  const unanswered = new Set<string>();
  latest.forEach((role, cpId) => {
    if (REVIEWER_ROLES.has(role)) unanswered.add(cpId);
  });
  return unanswered;
}

export async function listPesertaTopik(
  projectDesaId: string,
): Promise<PesertaTopikRow[]> {
  const supabase = createClient();

  // Project ID from project_desa
  const { data: pd } = await supabase
    .from("project_desa")
    .select("project_id")
    .eq("id", projectDesaId)
    .maybeSingle();
  if (!pd) return [];
  const projectId = (pd as { project_id: string }).project_id;

  // All topik
  const { data: topik } = await supabase
    .from("project_topik")
    .select("id, name, description, sort_order")
    .eq("project_id", projectId)
    .order("sort_order");

  const topikRows = (topik ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    sort_order: number;
  }>;
  if (topikRows.length === 0) return [];

  // All instances for this project_desa
  const { data: instances } = await supabase
    .from("desa_topik_instance")
    .select("id, project_topik_id, status, completion_percent")
    .eq("project_desa_id", projectDesaId);

  const instMap = new Map<
    string,
    {
      id: string;
      status: "not_started" | "in_progress" | "completed" | "needs_revision";
      completion_percent: number;
    }
  >();
  for (const i of (instances ?? []) as Array<{
    id: string;
    project_topik_id: string;
    status: PesertaTopikRow["status"];
    completion_percent: number;
  }>) {
    instMap.set(i.project_topik_id, {
      id: i.id,
      status: i.status,
      completion_percent: Number(i.completion_percent) || 0,
    });
  }

  // Item totals per topik
  const { data: items } = await supabase
    .from("project_checklist_item")
    .select("id, project_topik_id")
    .in(
      "project_topik_id",
      topikRows.map((t) => t.id),
    );
  const totalByTopik = new Map<string, number>();
  for (const it of (items ?? []) as Array<{ project_topik_id: string }>) {
    totalByTopik.set(
      it.project_topik_id,
      (totalByTopik.get(it.project_topik_id) ?? 0) + 1,
    );
  }

  // Progress counts per instance + unanswered review comments per instance
  const instanceIds = Array.from(instMap.values()).map((i) => i.id);
  const approvedByInst = new Map<string, number>();
  const pendingByInst = new Map<string, number>();
  const unansweredByInst = new Map<string, number>();
  if (instanceIds.length) {
    const { data: progress } = await supabase
      .from("checklist_progress")
      .select("id, desa_topik_instance_id, status")
      .in("desa_topik_instance_id", instanceIds);
    const progressRows = (progress ?? []) as Array<{
      id: string;
      desa_topik_instance_id: string;
      status: string;
    }>;
    for (const p of progressRows) {
      if (p.status === "approved") {
        approvedByInst.set(
          p.desa_topik_instance_id,
          (approvedByInst.get(p.desa_topik_instance_id) ?? 0) + 1,
        );
      } else if (p.status === "submitted") {
        pendingByInst.set(
          p.desa_topik_instance_id,
          (pendingByInst.get(p.desa_topik_instance_id) ?? 0) + 1,
        );
      }
    }
    // Per-instance unanswered review counts
    const unansweredCpIds = await getUnansweredCpIds(
      supabase,
      progressRows.map((p) => p.id),
    );
    for (const p of progressRows) {
      if (unansweredCpIds.has(p.id)) {
        unansweredByInst.set(
          p.desa_topik_instance_id,
          (unansweredByInst.get(p.desa_topik_instance_id) ?? 0) + 1,
        );
      }
    }
  }

  return topikRows.map((t) => {
    const inst = instMap.get(t.id);
    return {
      desa_topik_instance_id: inst?.id ?? "",
      project_topik_id: t.id,
      name: t.name,
      description: t.description,
      sort_order: t.sort_order,
      status: inst?.status ?? "not_started",
      completion_percent: inst?.completion_percent ?? 0,
      total_items: totalByTopik.get(t.id) ?? 0,
      approved_items: inst ? approvedByInst.get(inst.id) ?? 0 : 0,
      pending_items: inst ? pendingByInst.get(inst.id) ?? 0 : 0,
      unanswered_review_count: inst
        ? unansweredByInst.get(inst.id) ?? 0
        : 0,
    };
  });
}

// =====================================================
// Checklist items for a single topik instance (peserta detail view)
// =====================================================
export type ChecklistItemRow = {
  project_checklist_item_id: string;
  title: string;
  description: string | null;
  required: boolean;
  sort_order: number;
  checklist_progress_id: string | null;
  status: "not_started" | "submitted" | "approved" | "rejected";
  review_note: string | null;
  evidence_count: number;
  has_unanswered_review: boolean;
};

export async function listChecklistItems(
  projectDesaId: string,
  projectTopikId: string,
): Promise<{
  topik: { id: string; name: string; description: string | null } | null;
  desa_topik_instance_id: string | null;
  items: ChecklistItemRow[];
}> {
  const supabase = createClient();

  const [{ data: topikInfo }, { data: itemsRaw }, { data: instance }] =
    await Promise.all([
      supabase
        .from("project_topik")
        .select("id, name, description")
        .eq("id", projectTopikId)
        .maybeSingle(),
      supabase
        .from("project_checklist_item")
        .select("id, title, description, required, sort_order")
        .eq("project_topik_id", projectTopikId)
        .order("sort_order"),
      supabase
        .from("desa_topik_instance")
        .select("id")
        .eq("project_desa_id", projectDesaId)
        .eq("project_topik_id", projectTopikId)
        .maybeSingle(),
    ]);

  const items = (itemsRaw ?? []) as Array<{
    id: string;
    title: string;
    description: string | null;
    required: boolean;
    sort_order: number;
  }>;
  const instanceId = (instance as { id: string } | null)?.id ?? null;

  // Progress rows for this instance
  let progressByItem = new Map<
    string,
    {
      id: string;
      status: ChecklistItemRow["status"];
      review_note: string | null;
    }
  >();
  if (instanceId) {
    const { data: progressRaw } = await supabase
      .from("checklist_progress")
      .select("id, project_checklist_item_id, status, review_note")
      .eq("desa_topik_instance_id", instanceId);
    progressByItem = new Map(
      ((progressRaw ?? []) as Array<{
        id: string;
        project_checklist_item_id: string;
        status: ChecklistItemRow["status"];
        review_note: string | null;
      }>).map((p) => [p.project_checklist_item_id, p]),
    );
  }

  // Evidence counts
  const progressIds = Array.from(progressByItem.values()).map((p) => p.id);
  const evCounts = new Map<string, number>();
  if (progressIds.length) {
    const { data: tags } = await supabase
      .from("evidence_tags")
      .select("tag_target_id")
      .eq("tag_type", "checklist_progress")
      .in("tag_target_id", progressIds);
    for (const t of (tags ?? []) as Array<{ tag_target_id: string }>) {
      evCounts.set(t.tag_target_id, (evCounts.get(t.tag_target_id) ?? 0) + 1);
    }
  }

  // Per-item unanswered review flag
  const unansweredCpIds = await getUnansweredCpIds(supabase, progressIds);

  return {
    topik: topikInfo as { id: string; name: string; description: string | null } | null,
    desa_topik_instance_id: instanceId,
    items: items.map((it) => {
      const p = progressByItem.get(it.id);
      return {
        project_checklist_item_id: it.id,
        title: it.title,
        description: it.description,
        required: it.required,
        sort_order: it.sort_order,
        checklist_progress_id: p?.id ?? null,
        status: p?.status ?? "not_started",
        review_note: p?.review_note ?? null,
        evidence_count: p ? evCounts.get(p.id) ?? 0 : 0,
        has_unanswered_review: p ? unansweredCpIds.has(p.id) : false,
      };
    }),
  };
}
