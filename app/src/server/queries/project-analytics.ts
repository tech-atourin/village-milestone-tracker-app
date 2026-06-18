import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

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
  // Top narasumber by avg kuisioner rating (max 5)
  top_narasumber: Array<{
    name: string;
    avg_rating: number;
    rating_count: number;
  }>;
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
    action_plans_done: number;
    action_plans_total: number;
    action_plans_pct: number;
  }>;
  // Action plans stats
  action_plans_total: number;
  action_plans_by_status: Record<"rencana" | "on_track" | "selesai" | "ditunda", number>;
  // Hub assessment results (V2 Atourin)
  hub_assessment_results: Array<{
    desa_id: string;
    desa_name: string;
    level_hasil: string | null;
    skor_total: number | null;
    status: string;
  }>;
  // V1 ADWI assessment progress per desa, derived from
  // national_criteria_progress (counts of approved / submitted / total).
  v1_assessment_results: Array<{
    desa_id: string;
    desa_name: string;
    approved: number;
    submitted: number;
    rejected: number;
    total_progress: number;
  }>;
  // Narasumber roster size (memberships role=narasumber + anyone running
  // a session in this project, deduped).
  narasumber_count: number;
  // Distinct kompetensi covered by the narasumber roster.
  narasumber_kompetensi_count: number;
  // Project-wide kuisioner narasumber aggregate
  kuisioner: {
    avg_rating: number | null;
    rating_count: number;
    distribution: { "1": number; "2": number; "3": number; "4": number; "5": number };
  };
  // Per-topik checklist completion (% averaged across desa instances).
  // Checklist progress is per-desa (peserta from same desa share it), so we
  // average desa_topik_instance.completion_percent grouped by project_topik.
  checklist_by_topik: Array<{
    topik_id: string;
    topik_name: string;
    completion_pct: number;
    desa_done: number;
    desa_total: number;
  }>;
  // Per-materi kuisioner rating (avg across peserta) for each project_topik.
  rating_by_materi: Array<{
    topik_id: string;
    topik_name: string;
    avg_rating: number;
    rating_count: number;
  }>;
  // Per-materi pre→post test growth (avg per topik). Comes from
  // peserta_test_results scoped by project_topik_id.
  test_growth_by_materi: Array<{
    topik_id: string;
    topik_name: string;
    avg_pre: number | null;
    avg_post: number | null;
    delta: number | null;
    pre_count: number;
    post_count: number;
  }>;
};

export async function getProjectAnalytics(
  projectId: string,
): Promise<ProjectAnalytics> {
  // Admin client: analytics is read-only aggregation; callers enforce
  // project ownership before invoking (mitra/atourin page guards). Using
  // the anon client previously caused mitra to see empty radar/SWOT data
  // because RLS on users (narasumber kompetensi) and pendampingan_sessions
  // blocked the embedded joins.
  const supabase = createAdminClient();

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
      "id, status, narasumber:users!pendampingan_sessions_narasumber_id_fkey(id, full_name, kompetensi)",
    )
    .eq("project_id", projectId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sRows = (sessions ?? []) as any[];
  const materiMap = new Map<string, number>();
  let ses_verified = 0,
    ses_submitted = 0,
    ses_draft = 0;
  // Track full_name per narasumber_id so we can join ratings without
  // re-fetching the user table.
  const narasumberNameById = new Map<string, string>();
  for (const s of sRows) {
    if (s.status === "verified") ses_verified++;
    else if (s.status === "submitted") ses_submitted++;
    else ses_draft++;
    const k = s.narasumber?.kompetensi ?? "Lain-lain";
    materiMap.set(k, (materiMap.get(k) ?? 0) + 1);
    if (s.narasumber?.full_name && s.narasumber?.id)
      narasumberNameById.set(s.narasumber.id, s.narasumber.full_name);
  }
  const materi_by_kompetensi = Array.from(materiMap.entries()).map(
    ([kompetensi, sessions]) => ({ kompetensi, sessions }),
  );

  // Top narasumber by kuisioner rating - average of peserta ratings, scoped
  // to this project. Include narasumber that have a rating even if they didn't
  // run a session in our session list (covers seeded data).
  const { data: ratingRows } = await supabase
    .from("narasumber_ratings")
    .select("narasumber_id, rating, narasumber:users(full_name)")
    .eq("project_id", projectId);
  const ratingAgg = new Map<
    string,
    { name: string; sum: number; count: number }
  >();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of ((ratingRows ?? []) as any[])) {
    const id = r.narasumber_id as string;
    const name =
      r.narasumber?.full_name ?? narasumberNameById.get(id) ?? "Narasumber";
    const cur = ratingAgg.get(id) ?? { name, sum: 0, count: 0 };
    cur.sum += r.rating;
    cur.count += 1;
    ratingAgg.set(id, cur);
  }
  const top_narasumber = Array.from(ratingAgg.values())
    .map((r) => ({
      name: r.name,
      avg_rating: r.count > 0 ? r.sum / r.count : 0,
      rating_count: r.count,
    }))
    .sort((a, b) => b.avg_rating - a.avg_rating || b.rating_count - a.rating_count)
    .slice(0, 5);

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
  // Per-desa rencana aksi counts (done + total) so the Top Desa table can
  // show action plan progress alongside checklist progress.
  const apByPd = new Map<string, { done: number; total: number }>();
  if (projectDesaIds.length > 0) {
    const { data: apPerDesa } = await supabase
      .from("desa_action_plans")
      .select("project_desa_id, status")
      .in("project_desa_id", projectDesaIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (apPerDesa ?? []) as any[]) {
      const cur = apByPd.get(r.project_desa_id) ?? { done: 0, total: 0 };
      cur.total += 1;
      if (r.status === "selesai") cur.done += 1;
      apByPd.set(r.project_desa_id, cur);
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
      const ap = apByPd.get(d.id) ?? { done: 0, total: 0 };
      const apPct = ap.total > 0 ? (ap.done / ap.total) * 100 : 0;
      return {
        desa_id: d.desa_id as string,
        desa_name: (d.desa?.name as string) ?? "-",
        completion_pct: avg,
        peserta_count: pesertaByDesa.get(d.desa_id) ?? 0,
        sessions_done: sessionsByDesa.get(d.id) ?? 0,
        action_plans_done: ap.done,
        action_plans_total: ap.total,
        action_plans_pct: Math.round(apPct),
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

  // V1 ADWI assessment progress per desa (national_criteria_progress)
  let v1_assessment_results: ProjectAnalytics["v1_assessment_results"] = [];
  if (desaIds.length > 0) {
    const { data: ncp } = await supabase
      .from("national_criteria_progress")
      .select("desa_id, status, desa:desa(name)")
      .in("desa_id", desaIds);
    const agg = new Map<
      string,
      { name: string; approved: number; submitted: number; rejected: number; total: number }
    >();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (ncp ?? []) as any[]) {
      const id = r.desa_id as string;
      const cur = agg.get(id) ?? {
        name: r.desa?.name ?? "-",
        approved: 0,
        submitted: 0,
        rejected: 0,
        total: 0,
      };
      cur.total += 1;
      if (r.status === "approved") cur.approved += 1;
      else if (r.status === "submitted") cur.submitted += 1;
      else if (r.status === "rejected") cur.rejected += 1;
      agg.set(id, cur);
    }
    v1_assessment_results = Array.from(agg.entries()).map(([desa_id, v]) => ({
      desa_id,
      desa_name: v.name,
      approved: v.approved,
      submitted: v.submitted,
      rejected: v.rejected,
      total_progress: v.total,
    }));
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
      desa_name: r.desa?.name ?? "-",
      level_hasil: r.level_hasil,
      skor_total: r.skor_total,
      status: r.status,
    }));
  }

  // Narasumber roster - union of memberships (role=narasumber) and anyone
  // running a session in this project. Plus distinct kompetensi covered.
  const narasumberIds = new Set<string>();
  const kompetensiSet = new Set<string>();
  const { data: nsMemberships } = await supabase
    .from("project_memberships")
    .select(
      "user_id, user:users!project_memberships_user_id_fkey(kompetensi)",
    )
    .eq("project_id", projectId)
    .eq("role", "narasumber")
    .eq("status", "active");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const m of (nsMemberships ?? []) as any[]) {
    if (m.user_id) narasumberIds.add(m.user_id);
    if (m.user?.kompetensi) kompetensiSet.add(m.user.kompetensi);
  }
  for (const s of sRows) {
    if (s.narasumber?.id) narasumberIds.add(s.narasumber.id);
    if (s.narasumber?.kompetensi) kompetensiSet.add(s.narasumber.kompetensi);
  }

  // Kuisioner aggregate - also produce 1..5 distribution for the histogram.
  const distribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  let kuisionerSum = 0;
  let kuisionerCount = 0;
  // ratingRows was loaded earlier for top_narasumber
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of ((ratingRows ?? []) as any[])) {
    const v = Number(r.rating);
    if (!Number.isFinite(v) || v < 1 || v > 5) continue;
    kuisionerSum += v;
    kuisionerCount += 1;
    const key = String(Math.round(v)) as keyof typeof distribution;
    distribution[key] += 1;
  }

  // Per-topik completion across all desa in the project. Group
  // desa_topik_instance.completion_percent by project_topik.id.
  type TopikAggRow = {
    completion_percent: number | null;
    project_topik: {
      id: string;
      name: string | null;
      title: string | null;
    } | null;
  };
  const { data: ptInstances } = await supabase
    .from("desa_topik_instance")
    .select(
      "completion_percent, project_topik:project_topik!inner(id, name, project_id)",
    )
    .eq("project_topik.project_id", projectId);
  const topikAgg = new Map<
    string,
    { name: string; sum: number; count: number; done: number; total: number }
  >();
  for (const r of ((ptInstances ?? []) as unknown) as TopikAggRow[]) {
    const pt = r.project_topik;
    if (!pt) continue;
    const cur = topikAgg.get(pt.id) ?? {
      name: pt.name ?? pt.title ?? "-",
      sum: 0,
      count: 0,
      done: 0,
      total: 0,
    };
    const pct = Number(r.completion_percent ?? 0);
    cur.sum += pct;
    cur.count += 1;
    cur.total += 1;
    if (pct >= 100) cur.done += 1;
    topikAgg.set(pt.id, cur);
  }
  const checklist_by_topik = Array.from(topikAgg.entries())
    .map(([topik_id, v]) => ({
      topik_id,
      topik_name: v.name,
      completion_pct: v.count > 0 ? v.sum / v.count : 0,
      desa_done: v.done,
      desa_total: v.total,
    }))
    .sort((a, b) => b.completion_pct - a.completion_pct);

  // Per-materi narasumber rating: avg + count grouped by project_topik.
  type TopikRatingRow = {
    project_topik_id: string;
    rating: number;
    project_topik: { id: string; name: string | null } | null;
  };
  const { data: ratingsByTopik } = await supabase
    .from("narasumber_ratings")
    .select(
      "project_topik_id, rating, project_topik:project_topik(id, name)",
    )
    .eq("project_id", projectId)
    .not("project_topik_id", "is", null);
  const ratingByMateriAgg = new Map<
    string,
    { name: string; sum: number; count: number }
  >();
  for (const r of ((ratingsByTopik ?? []) as unknown) as TopikRatingRow[]) {
    const id = r.project_topik_id;
    const name = r.project_topik?.name ?? "-";
    const cur = ratingByMateriAgg.get(id) ?? { name, sum: 0, count: 0 };
    cur.sum += Number(r.rating);
    cur.count += 1;
    ratingByMateriAgg.set(id, cur);
  }
  const rating_by_materi = Array.from(ratingByMateriAgg.entries())
    .map(([topik_id, v]) => ({
      topik_id,
      topik_name: v.name,
      avg_rating: v.count > 0 ? v.sum / v.count : 0,
      rating_count: v.count,
    }))
    .sort((a, b) => b.avg_rating - a.avg_rating);

  // Per-materi pre/post test growth (from peserta_test_results scoped to topik).
  type TestRow = {
    project_topik_id: string | null;
    score: number | null;
    project_topik: { id: string; name: string | null } | null;
    gform: { form_type: string | null } | null;
  };
  const { data: testRows } = await supabase
    .from("peserta_test_results")
    .select(
      "project_topik_id, score, project_topik:project_topik(id, name), gform:project_gforms!inner(form_type, project_id)",
    )
    .eq("gform.project_id", projectId)
    .not("project_topik_id", "is", null);
  const testAgg = new Map<
    string,
    {
      name: string;
      pre_sum: number;
      pre_count: number;
      post_sum: number;
      post_count: number;
    }
  >();
  for (const r of ((testRows ?? []) as unknown) as TestRow[]) {
    if (!r.project_topik_id || r.score == null) continue;
    const id = r.project_topik_id;
    const cur = testAgg.get(id) ?? {
      name: r.project_topik?.name ?? "-",
      pre_sum: 0,
      pre_count: 0,
      post_sum: 0,
      post_count: 0,
    };
    if (r.gform?.form_type === "pre_test") {
      cur.pre_sum += Number(r.score);
      cur.pre_count += 1;
    } else if (r.gform?.form_type === "post_test") {
      cur.post_sum += Number(r.score);
      cur.post_count += 1;
    }
    testAgg.set(id, cur);
  }
  const test_growth_by_materi = Array.from(testAgg.entries())
    .map(([topik_id, v]) => {
      const avg_pre = v.pre_count > 0 ? v.pre_sum / v.pre_count : null;
      const avg_post = v.post_count > 0 ? v.post_sum / v.post_count : null;
      const delta =
        avg_pre != null && avg_post != null ? avg_post - avg_pre : null;
      return {
        topik_id,
        topik_name: v.name,
        avg_pre,
        avg_post,
        delta,
        pre_count: v.pre_count,
        post_count: v.post_count,
      };
    })
    .sort((a, b) => (b.delta ?? -Infinity) - (a.delta ?? -Infinity));

  return {
    project: {
      id: project?.id ?? projectId,
      name: project?.name ?? "-",
      total_days: project?.total_pendampingan_days ?? 5,
    },
    peserta_total: peserta.length,
    peserta_gender: gender,
    desa_total: desaRows.length,
    desa_by_tier: tierCounts,
    materi_by_kompetensi,
    top_narasumber,
    sessions_total: sRows.length,
    sessions_verified: ses_verified,
    sessions_submitted: ses_submitted,
    sessions_draft: ses_draft,
    attendance_avg_pct,
    top_desa,
    action_plans_total: (aps ?? []).length,
    action_plans_by_status: apStatus,
    hub_assessment_results,
    v1_assessment_results,
    narasumber_count: narasumberIds.size,
    narasumber_kompetensi_count: kompetensiSet.size,
    kuisioner: {
      avg_rating: kuisionerCount > 0 ? kuisionerSum / kuisionerCount : null,
      rating_count: kuisionerCount,
      distribution,
    },
    checklist_by_topik,
    rating_by_materi,
    test_growth_by_materi,
  };
}
