import "server-only";

import { createClient } from "@/lib/supabase/server";

// =====================================================
// Rapor Desa - aggregated per (project, desa)
// =====================================================
// Each desa in a project may have multiple peserta. The desa-level
// rapor accumulates pre/post/attendance averages across those peserta
// AND surfaces project-level metrics (checklist completion, evidence
// approved). This is what the desa wisata role sees as "program
// history" - one row per project the desa has joined.
// =====================================================

export type RaporDesaRow = {
  project_desa_id: string;
  desa_id: string;
  desa_name: string;
  kabupaten: string | null;
  provinsi: string | null;
  peserta_count: number;
  peserta_with_rapor: number;
  avg_pre: number | null;
  avg_post: number | null;
  avg_attendance: number | null;
  avg_improvement: number | null;
  checklist_completion_pct: number;
  evidence_approved: number;
};

function avg(nums: Array<number | null | undefined>): number | null {
  const vals = nums
    .map((n) => (n == null ? null : Number(n)))
    .filter((n): n is number => n != null && Number.isFinite(n));
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export async function listProjectRaporDesa(
  projectId: string,
): Promise<RaporDesaRow[]> {
  const supabase = createClient();

  const { data: projectDesa } = await supabase
    .from("project_desa")
    .select(
      "id, desa_id, desa:desa(id, name, kabupaten, provinsi)",
    )
    .eq("project_id", projectId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdRows = ((projectDesa ?? []) as any[]).map((r) => ({
    project_desa_id: r.id as string,
    desa_id: r.desa_id as string,
    desa_name: (r.desa?.name as string) ?? "-",
    kabupaten: (r.desa?.kabupaten as string) ?? null,
    provinsi: (r.desa?.provinsi as string) ?? null,
  }));

  if (pdRows.length === 0) return [];

  const desaIds = pdRows.map((r) => r.desa_id);

  // 1. Peserta count + their user_ids per desa (project_memberships)
  const { data: memberships } = await supabase
    .from("project_memberships")
    .select("user_id, desa_id")
    .eq("project_id", projectId)
    .eq("role", "peserta")
    .eq("status", "active")
    .in("desa_id", desaIds);

  const userIdsByDesa = new Map<string, string[]>();
  for (const m of (memberships ?? []) as Array<{
    user_id: string;
    desa_id: string;
  }>) {
    const arr = userIdsByDesa.get(m.desa_id) ?? [];
    arr.push(m.user_id);
    userIdsByDesa.set(m.desa_id, arr);
  }

  // 2. Rapor for those peserta
  const allUserIds = Array.from(new Set((memberships ?? []).map((m) => m.user_id)));
  const raporByUser = new Map<
    string,
    {
      pre_test_score: number | null;
      post_test_score: number | null;
      attendance: number | null;
      improvement_percent: number | null;
    }
  >();
  if (allUserIds.length > 0) {
    const { data: rapors } = await supabase
      .from("rapor_peserta")
      .select(
        "user_id, pre_test_score, post_test_score, attendance, improvement_percent",
      )
      .eq("project_id", projectId)
      .in("user_id", allUserIds);
    for (const r of (rapors ?? []) as Array<{
      user_id: string;
      pre_test_score: number | null;
      post_test_score: number | null;
      attendance: number | null;
      improvement_percent: number | null;
    }>) {
      raporByUser.set(r.user_id, r);
    }
  }

  // 3. Checklist completion + evidence approved per project_desa
  const projectDesaIds = pdRows.map((r) => r.project_desa_id);
  const { data: instances } = await supabase
    .from("desa_topik_instance")
    .select("project_desa_id, completion_percent")
    .in("project_desa_id", projectDesaIds);
  const completionByPd = new Map<string, number[]>();
  for (const i of (instances ?? []) as Array<{
    project_desa_id: string;
    completion_percent: number | string;
  }>) {
    const arr = completionByPd.get(i.project_desa_id) ?? [];
    arr.push(Number(i.completion_percent));
    completionByPd.set(i.project_desa_id, arr);
  }

  const { data: evidenceRows } = await supabase
    .from("checklist_progress")
    .select("project_desa_id, status")
    .in("project_desa_id", projectDesaIds)
    .eq("status", "approved");
  const evidenceByPd = new Map<string, number>();
  for (const e of (evidenceRows ?? []) as Array<{ project_desa_id: string }>) {
    evidenceByPd.set(
      e.project_desa_id,
      (evidenceByPd.get(e.project_desa_id) ?? 0) + 1,
    );
  }

  // 4. Assemble
  return pdRows.map((pd) => {
    const userIds = userIdsByDesa.get(pd.desa_id) ?? [];
    const rapors = userIds
      .map((uid) => raporByUser.get(uid))
      .filter((r): r is NonNullable<typeof r> => !!r);
    const completions = completionByPd.get(pd.project_desa_id) ?? [];
    const checklistAvg = completions.length
      ? Math.round(
          (completions.reduce((a, b) => a + b, 0) / completions.length) * 10,
        ) / 10
      : 0;

    return {
      project_desa_id: pd.project_desa_id,
      desa_id: pd.desa_id,
      desa_name: pd.desa_name,
      kabupaten: pd.kabupaten,
      provinsi: pd.provinsi,
      peserta_count: userIds.length,
      peserta_with_rapor: rapors.length,
      avg_pre: avg(rapors.map((r) => r.pre_test_score)),
      avg_post: avg(rapors.map((r) => r.post_test_score)),
      avg_attendance: avg(rapors.map((r) => r.attendance)),
      avg_improvement: avg(rapors.map((r) => r.improvement_percent)),
      checklist_completion_pct: checklistAvg,
      evidence_approved: evidenceByPd.get(pd.project_desa_id) ?? 0,
    };
  });
}

// =====================================================
// Detail for one (project, desa) - for printable rapor page
// =====================================================

export type RaporDesaDetail = {
  project: {
    id: string;
    name: string;
    period_start: string | null;
    period_end: string | null;
    organization: {
      name: string;
      logo_url: string | null;
    } | null;
  };
  desa: {
    id: string;
    name: string;
    kabupaten: string | null;
    provinsi: string | null;
    current_classification: string | null;
  };
  aggregate: Omit<RaporDesaRow, "desa_name" | "kabupaten" | "provinsi">;
  peserta: Array<{
    user_id: string;
    full_name: string;
    email: string | null;
    pre_test_score: number | null;
    post_test_score: number | null;
    attendance: number | null;
    improvement_percent: number | null;
  }>;
  topik: Array<{
    topik_id: string;
    title: string;
    completion_percent: number;
  }>;
  // Kuisioner narasumber that peserta of this desa filled in this project.
  narasumber: {
    avg_rating: number | null;
    rating_count: number;
    by_narasumber: Array<{
      narasumber_id: string;
      name: string;
      avg_rating: number;
      rating_count: number;
      sessions_count: number;
    }>;
  };
  action_plans: {
    total: number;
    by_status: { rencana: number; on_track: number; selesai: number; ditunda: number };
  };
  // SWOT analysis from ai_insights (insight_type='swot') for this project_desa.
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  } | null;
};

export async function getRaporDesaDetail(
  projectId: string,
  desaId: string,
): Promise<RaporDesaDetail | null> {
  const supabase = createClient();

  const [{ data: project }, { data: desa }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, name, period_start, period_end, organization:organizations(name, logo_url)",
      )
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("desa")
      .select("id, name, kabupaten, provinsi, current_classification")
      .eq("id", desaId)
      .maybeSingle(),
  ]);

  if (!project || !desa) return null;

  // Aggregates - reuse listProjectRaporDesa and pick this desa
  const all = await listProjectRaporDesa(projectId);
  const aggregate = all.find((r) => r.desa_id === desaId);
  if (!aggregate) return null;

  // Peserta list with their individual rapor
  const { data: members } = await supabase
    .from("project_memberships")
    .select("user_id, user:users!project_memberships_user_id_fkey(id, full_name, email)")
    .eq("project_id", projectId)
    .eq("desa_id", desaId)
    .eq("role", "peserta")
    .eq("status", "active");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberRows = ((members ?? []) as any[]).map((r) => ({
    user_id: r.user_id as string,
    full_name: (r.user?.full_name as string) ?? "-",
    email: (r.user?.email as string) ?? null,
  }));

  const userIds = memberRows.map((m) => m.user_id);
  const raporByUser = new Map<
    string,
    {
      pre_test_score: number | null;
      post_test_score: number | null;
      attendance: number | null;
      improvement_percent: number | null;
    }
  >();
  if (userIds.length > 0) {
    const { data: rapors } = await supabase
      .from("rapor_peserta")
      .select(
        "user_id, pre_test_score, post_test_score, attendance, improvement_percent",
      )
      .eq("project_id", projectId)
      .in("user_id", userIds);
    for (const r of (rapors ?? []) as Array<{
      user_id: string;
      pre_test_score: number | null;
      post_test_score: number | null;
      attendance: number | null;
      improvement_percent: number | null;
    }>) {
      raporByUser.set(r.user_id, r);
    }
  }

  const peserta = memberRows.map((m) => ({
    ...m,
    ...(raporByUser.get(m.user_id) ?? {
      pre_test_score: null,
      post_test_score: null,
      attendance: null,
      improvement_percent: null,
    }),
  }));

  // Topik completion for this desa
  const { data: instances } = await supabase
    .from("desa_topik_instance")
    .select(
      "completion_percent, project_topik:project_topik!inner(id, title, project_desa:project_desa!inner(desa_id, project_id))",
    )
    .eq("project_topik.project_desa.project_id", projectId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topikRaw = ((instances ?? []) as any[]).filter(
    (i) => i.project_topik?.project_desa?.desa_id === desaId,
  );
  const topik = topikRaw.map((i) => ({
    topik_id: i.project_topik?.id as string,
    title: (i.project_topik?.title as string) ?? "-",
    completion_percent: Number(i.completion_percent ?? 0),
  }));

  // Kuisioner narasumber - only ratings from this desa's peserta in this
  // project. Group by narasumber to surface per-narasumber averages.
  const projectDesaId = aggregate.project_desa_id;
  const { data: desaSessions } = await supabase
    .from("pendampingan_sessions")
    .select(
      "narasumber_id, narasumber:users!pendampingan_sessions_narasumber_id_fkey(full_name)",
    )
    .eq("project_id", projectId)
    .eq("project_desa_id", projectDesaId);
  const sessionsByNs = new Map<
    string,
    { name: string; sessions_count: number }
  >();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of ((desaSessions ?? []) as any[])) {
    if (!s.narasumber_id) continue;
    const cur = sessionsByNs.get(s.narasumber_id) ?? {
      name: s.narasumber?.full_name ?? "Narasumber",
      sessions_count: 0,
    };
    cur.sessions_count += 1;
    sessionsByNs.set(s.narasumber_id, cur);
  }

  const { data: ratingRows } =
    userIds.length > 0
      ? await supabase
          .from("narasumber_ratings")
          .select(
            "narasumber_id, rating, narasumber:users!narasumber_ratings_narasumber_id_fkey(full_name)",
          )
          .eq("project_id", projectId)
          .in("rater_id", userIds)
      : { data: [] as Array<Record<string, unknown>> };
  const ratingsByNs = new Map<
    string,
    { name: string; sum: number; count: number }
  >();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of ((ratingRows ?? []) as any[])) {
    const cur = ratingsByNs.get(r.narasumber_id) ?? {
      name:
        r.narasumber?.full_name ??
        sessionsByNs.get(r.narasumber_id)?.name ??
        "Narasumber",
      sum: 0,
      count: 0,
    };
    cur.sum += r.rating;
    cur.count += 1;
    ratingsByNs.set(r.narasumber_id, cur);
  }
  // Union narasumber known via sessions OR ratings so the table is complete
  // even when one side is empty.
  const narasumberIds = new Set<string>([
    ...Array.from(sessionsByNs.keys()),
    ...Array.from(ratingsByNs.keys()),
  ]);
  let ratingSum = 0;
  let ratingCount = 0;
  const byNarasumber = Array.from(narasumberIds).map((id) => {
    const rating = ratingsByNs.get(id);
    const sess = sessionsByNs.get(id);
    if (rating) {
      ratingSum += rating.sum;
      ratingCount += rating.count;
    }
    return {
      narasumber_id: id,
      name: rating?.name ?? sess?.name ?? "Narasumber",
      avg_rating: rating && rating.count > 0 ? rating.sum / rating.count : 0,
      rating_count: rating?.count ?? 0,
      sessions_count: sess?.sessions_count ?? 0,
    };
  });
  byNarasumber.sort(
    (a, b) => b.avg_rating - a.avg_rating || b.rating_count - a.rating_count,
  );
  const narasumberSummary = {
    avg_rating: ratingCount > 0 ? ratingSum / ratingCount : null,
    rating_count: ratingCount,
    by_narasumber: byNarasumber,
  };

  // Action plans for this desa
  const { data: apRows } = await supabase
    .from("desa_action_plans")
    .select("status")
    .eq("project_desa_id", projectDesaId);
  const apStatus = { rencana: 0, on_track: 0, selesai: 0, ditunda: 0 };
  for (const r of (apRows ?? []) as Array<{
    status: keyof typeof apStatus;
  }>) {
    if (apStatus[r.status] !== undefined) apStatus[r.status] += 1;
  }
  const actionPlansSummary = {
    total: (apRows ?? []).length,
    by_status: apStatus,
  };

  // SWOT from ai_insights (insight_type='swot') for this project_desa
  const { data: swotRow } = await supabase
    .from("ai_insights")
    .select("content")
    .eq("target_type", "project_desa")
    .eq("target_id", projectDesaId)
    .eq("insight_type", "swot")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const swot = (swotRow as any)?.content
    ? {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        strengths: ((swotRow as any).content.strengths ?? []) as string[],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        weaknesses: ((swotRow as any).content.weaknesses ?? []) as string[],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        opportunities: ((swotRow as any).content.opportunities ?? []) as string[],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        threats: ((swotRow as any).content.threats ?? []) as string[],
      }
    : null;

  return {
    project: {
      id: project.id as string,
      name: project.name as string,
      period_start: project.period_start as string | null,
      period_end: project.period_end as string | null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      organization: ((project as any).organization ?? null) as {
        name: string;
        logo_url: string | null;
      } | null,
    },
    desa: {
      id: desa.id as string,
      name: desa.name as string,
      kabupaten: (desa.kabupaten as string) ?? null,
      provinsi: (desa.provinsi as string) ?? null,
      current_classification: (desa.current_classification as string) ?? null,
    },
    aggregate: {
      project_desa_id: aggregate.project_desa_id,
      desa_id: aggregate.desa_id,
      peserta_count: aggregate.peserta_count,
      peserta_with_rapor: aggregate.peserta_with_rapor,
      avg_pre: aggregate.avg_pre,
      avg_post: aggregate.avg_post,
      avg_attendance: aggregate.avg_attendance,
      avg_improvement: aggregate.avg_improvement,
      checklist_completion_pct: aggregate.checklist_completion_pct,
      evidence_approved: aggregate.evidence_approved,
    },
    peserta,
    topik,
    narasumber: narasumberSummary,
    action_plans: actionPlansSummary,
    swot,
  };
}

// =====================================================
// Desa program history - used by /desa role
// =====================================================

export type DesaProgramHistoryRow = {
  project_id: string;
  project_name: string;
  period_start: string | null;
  period_end: string | null;
  status: "draft" | "active" | "completed" | "archived";
  organization_name: string | null;
  peserta_count: number;
  checklist_completion_pct: number;
  avg_improvement: number | null;
};

export async function listDesaProgramHistory(
  desaId: string,
): Promise<DesaProgramHistoryRow[]> {
  const supabase = createClient();

  const { data: pdRows } = await supabase
    .from("project_desa")
    .select(
      "id, project:projects(id, name, period_start, period_end, status, organization:organizations(name))",
    )
    .eq("desa_id", desaId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((pdRows ?? []) as any[])
    .filter((r) => r.project && r.project.status !== "archived")
    .map((r) => ({
      project_desa_id: r.id as string,
      project_id: r.project.id as string,
      project_name: r.project.name as string,
      period_start: (r.project.period_start as string) ?? null,
      period_end: (r.project.period_end as string) ?? null,
      status: r.project.status as DesaProgramHistoryRow["status"],
      organization_name: (r.project.organization?.name as string) ?? null,
    }));

  // Enrich with aggregates per project
  const out: DesaProgramHistoryRow[] = [];
  for (const row of rows) {
    const all = await listProjectRaporDesa(row.project_id);
    const mine = all.find((a) => a.desa_id === desaId);
    out.push({
      project_id: row.project_id,
      project_name: row.project_name,
      period_start: row.period_start,
      period_end: row.period_end,
      status: row.status,
      organization_name: row.organization_name,
      peserta_count: mine?.peserta_count ?? 0,
      checklist_completion_pct: mine?.checklist_completion_pct ?? 0,
      avg_improvement: mine?.avg_improvement ?? null,
    });
  }
  // Most recent first
  return out.sort((a, b) => (b.period_start ?? "").localeCompare(a.period_start ?? ""));
}
