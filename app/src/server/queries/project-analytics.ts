import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ProjectAnalytics = {
  project: {
    id: string;
    name: string;
    total_days: number;
  };
  // Demografi peserta
  peserta_total: number;
  peserta_gender: { L: number; P: number; unknown: number };
  // Klasifikasi tier desa (post-mapping)
  desa_total: number;
  desa_by_tier: Record<"rintisan" | "berkembang" | "maju" | "mandiri" | "unclassified", number>;
  // Materi pendampingan (count sessions per pilar competence)
  // We approximate per-narasumber kompetensi: each session links to a narasumber's kompetensi
  materi_by_kompetensi: Array<{ kompetensi: string; sessions: number }>;
  // Sesi summary
  sessions_total: number;
  sessions_verified: number;
  sessions_submitted: number;
  sessions_draft: number;
  // Attendance avg per desa
  attendance_avg_pct: number;
  // Top desa by checklist completion
  top_desa: Array<{
    desa_id: string;
    desa_name: string;
    completion_pct: number;
    peserta_count: number;
    sessions_done: number;
  }>;
  // Action plans stats
  action_plans_total: number;
  action_plans_by_status: Record<"rencana" | "on_track" | "selesai" | "ditunda", number>;
  // Hub assessment results (Versi 2)
  hub_assessment_results: Array<{
    desa_id: string;
    desa_name: string;
    level_hasil: string | null;
    skor_total: number | null;
    status: string;
  }>;
};

export async function getProjectAnalytics(
  projectId: string,
): Promise<ProjectAnalytics> {
  const supabase = createClient();

  const { data: pr } = await supabase
    .from("projects")
    .select("id, name, total_pendampingan_days")
    .eq("id", projectId)
    .maybeSingle();
  const project = pr as {
    id: string;
    name: string;
    total_pendampingan_days: number;
  } | null;

  // Peserta
  const { data: memberships } = await supabase
    .from("project_memberships")
    .select("user_id, role, desa_id, user:users!project_memberships_user_id_fkey(gender)")
    .eq("project_id", projectId)
    .eq("status", "active");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const peserta = ((memberships ?? []) as any[]).filter(
    (m) => m.role === "peserta",
  );
  const gender = { L: 0, P: 0, unknown: 0 };
  for (const p of peserta) {
    const g = p.user?.gender;
    if (g === "L") gender.L++;
    else if (g === "P") gender.P++;
    else gender.unknown++;
  }

  // Desa attached
  const { data: pdRows } = await supabase
    .from("project_desa")
    .select(
      "id, desa_id, desa:desa(name, current_classification)",
    )
    .eq("project_id", projectId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const desaRows = (pdRows ?? []) as any[];
  const tierCounts: ProjectAnalytics["desa_by_tier"] = {
    rintisan: 0,
    berkembang: 0,
    maju: 0,
    mandiri: 0,
    unclassified: 0,
  };
  for (const d of desaRows) {
    const t = d.desa?.current_classification ?? "unclassified";
    if (t in tierCounts) tierCounts[t as keyof typeof tierCounts]++;
    else tierCounts.unclassified++;
  }
  const desaIds = desaRows.map((r) => r.desa_id);
  const projectDesaIds = desaRows.map((r) => r.id);

  // Sessions + materi (group by narasumber.kompetensi)
  const { data: sessions } = await supabase
    .from("pendampingan_sessions")
    .select(
      "id, status, narasumber:users!pendampingan_sessions_narasumber_id_fkey(kompetensi)",
    )
    .eq("project_id", projectId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sRows = (sessions ?? []) as any[];
  const materiMap = new Map<string, number>();
  let ses_verified = 0, ses_submitted = 0, ses_draft = 0;
  for (const s of sRows) {
    if (s.status === "verified") ses_verified++;
    else if (s.status === "submitted") ses_submitted++;
    else ses_draft++;
    const k = s.narasumber?.kompetensi ?? "Lain-lain";
    materiMap.set(k, (materiMap.get(k) ?? 0) + 1);
  }
  const materi_by_kompetensi = Array.from(materiMap.entries()).map(
    ([kompetensi, sessions]) => ({ kompetensi, sessions }),
  );

  // Attendance avg pct
  let totalAttendance = 0;
  let totalAttendanceMax = 0;
  const sIds = sRows.map((s) => s.id);
  if (sIds.length > 0) {
    const { data: att } = await supabase
      .from("pendampingan_attendance")
      .select("status")
      .in("session_id", sIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const a of ((att ?? []) as any[])) {
      totalAttendanceMax++;
      if (a.status === "hadir") totalAttendance++;
    }
  }
  const attendance_avg_pct =
    totalAttendanceMax > 0
      ? Math.round((totalAttendance / totalAttendanceMax) * 100)
      : 0;

  // Top desa by completion
  const { data: instances } = await supabase
    .from("desa_topik_instance")
    .select("project_desa_id, completion_percent")
    .in(
      "project_desa_id",
      projectDesaIds.length > 0 ? projectDesaIds : ["__none__"],
    );
  const completionByPd = new Map<string, number[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const i of (instances ?? []) as any[]) {
    const arr = completionByPd.get(i.project_desa_id) ?? [];
    arr.push(Number(i.completion_percent ?? 0));
    completionByPd.set(i.project_desa_id, arr);
  }
  const pesertaByDesa = new Map<string, number>();
  for (const p of peserta) {
    pesertaByDesa.set(p.desa_id, (pesertaByDesa.get(p.desa_id) ?? 0) + 1);
  }
  const sessionsByDesa = new Map<string, number>();
  {
    const { data: sd } = await supabase
      .from("pendampingan_sessions")
      .select("project_desa_id, status")
      .eq("project_id", projectId)
      .in("status", ["submitted", "verified"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of ((sd ?? []) as any[])) {
      sessionsByDesa.set(
        r.project_desa_id,
        (sessionsByDesa.get(r.project_desa_id) ?? 0) + 1,
      );
    }
  }
  const top_desa = desaRows
    .map((d) => {
      const completions = completionByPd.get(d.id) ?? [];
      const avg =
        completions.length > 0
          ? Math.round(
              (completions.reduce((a, b) => a + b, 0) / completions.length) *
                10,
            ) / 10
          : 0;
      return {
        desa_id: d.desa_id as string,
        desa_name: (d.desa?.name as string) ?? "—",
        completion_pct: avg,
        peserta_count: pesertaByDesa.get(d.desa_id) ?? 0,
        sessions_done: sessionsByDesa.get(d.id) ?? 0,
      };
    })
    .sort((a, b) => b.completion_pct - a.completion_pct)
    .slice(0, 5);

  // Action plans
  const { data: aps } = await supabase
    .from("desa_action_plans")
    .select("status")
    .eq("project_id", projectId);
  const apStatus: ProjectAnalytics["action_plans_by_status"] = {
    rencana: 0,
    on_track: 0,
    selesai: 0,
    ditunda: 0,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of ((aps ?? []) as any[])) {
    if (r.status in apStatus) apStatus[r.status as keyof typeof apStatus]++;
  }

  // Hub assessment results for desa in this project
  let hub_assessment_results: ProjectAnalytics["hub_assessment_results"] = [];
  if (desaIds.length > 0) {
    const { data: hubA } = await supabase
      .from("hub_assessment")
      .select(
        "desa_id, level_hasil, skor_total, status, desa:desa(name)",
      )
      .in("desa_id", desaIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hub_assessment_results = ((hubA ?? []) as any[]).map((r) => ({
      desa_id: r.desa_id,
      desa_name: r.desa?.name ?? "—",
      level_hasil: r.level_hasil,
      skor_total: r.skor_total,
      status: r.status,
    }));
  }

  return {
    project: {
      id: project?.id ?? projectId,
      name: project?.name ?? "—",
      total_days: project?.total_pendampingan_days ?? 5,
    },
    peserta_total: peserta.length,
    peserta_gender: gender,
    desa_total: desaRows.length,
    desa_by_tier: tierCounts,
    materi_by_kompetensi,
    sessions_total: sRows.length,
    sessions_verified: ses_verified,
    sessions_submitted: ses_submitted,
    sessions_draft: ses_draft,
    attendance_avg_pct,
    top_desa,
    action_plans_total: (aps ?? []).length,
    action_plans_by_status: apStatus,
    hub_assessment_results,
  };
}
