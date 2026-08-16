import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { getProjectCheckinMatrix } from "@/server/queries/checkin";

export type RaporRow = {
  user_id: string;
  full_name: string;
  email: string | null;
  desa_name: string | null;
  batch_name: string | null;
  attendance_mode: "offline" | "online";
  pre_test_score: number | null;
  post_test_score: number | null;
  // Nilai pre/post otomatis dari hasil kuis (peserta_test_results), rata-rata
  // semua topik. Dipakai untuk pre-fill kolom rapor bila belum diisi manual.
  auto_pre_test_score: number | null;
  auto_post_test_score: number | null;
  tugas_score: number | null;
  keaktifan_score: number | null;
  final_score: number | null;
  attendance: number | null;
  improvement_percent: number | null;
  has_rapor: boolean;
};

export async function listProjectRapor(projectId: string): Promise<RaporRow[]> {
  // rapor_peserta RLS only opens to desa_wisata; staff readers (superadmin,
  // mitra, narasumber) need admin client. Callers gate by role.
  const supabase = createAdminClient();

  const { data: members } = await supabase
    .from("project_memberships")
    .select(
      "user_id, attendance_mode, user:users!project_memberships_user_id_fkey(id, full_name, email, address, kota), desa:desa(name, is_individual_unit), batch:project_batches(name)",
    )
    .eq("project_id", projectId)
    .eq("role", "peserta")
    .eq("status", "active");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberRows = ((members ?? []) as any[]).map((r) => {
    // Peserta individu tidak punya desa nyata: unit tersembunyi (is_individual_unit)
    // dinamai sesuai nama peserta, jadi jangan dipakai sebagai "Desa". Pakai
    // desa asal peserta (address/kota) - konsisten dengan halaman data peserta.
    const asal =
      [r.user?.address, r.user?.kota].filter(Boolean).join(", ") || null;
    const desaName =
      r.desa && !r.desa.is_individual_unit ? r.desa.name : asal;
    return {
      user_id: r.user_id as string,
      full_name: r.user?.full_name ?? "-",
      email: r.user?.email ?? null,
      desa_name: desaName,
      batch_name: (r.batch?.name as string | null) ?? null,
      attendance_mode: (r.attendance_mode ?? "offline") as "offline" | "online",
    };
  });

  if (memberRows.length === 0) return [];

  const { data: rapors } = await supabase
    .from("rapor_peserta")
    .select(
      "user_id, pre_test_score, post_test_score, tugas_score, keaktifan_score, final_score, improvement_percent",
    )
    .eq("project_id", projectId)
    .in(
      "user_id",
      memberRows.map((m) => m.user_id),
    );

  const raporMap = new Map<
    string,
    {
      pre_test_score: number | null;
      post_test_score: number | null;
      tugas_score: number | null;
      keaktifan_score: number | null;
      final_score: number | null;
      improvement_percent: number | null;
    }
  >();
  for (const r of (rapors ?? []) as Array<{
    user_id: string;
    pre_test_score: number | null;
    post_test_score: number | null;
    tugas_score: number | null;
    keaktifan_score: number | null;
    final_score: number | null;
    improvement_percent: number | null;
  }>) {
    raporMap.set(r.user_id, r);
  }

  // Nilai kuis otomatis: rata-rata pre/post per peserta dari peserta_test_results
  // (sumber GForm ATAU kuis native, keduanya menyimpan form_type + max_score).
  // Dinormalisasi ke persen lalu dirata-rata semua topik.
  const { data: testResults } = await supabase
    .from("peserta_test_results")
    .select(
      "user_id, score, max_score, form_type, project_topik:project_topik!inner(project_id)",
    )
    .eq("project_topik.project_id", projectId)
    .in("form_type", ["pre_test", "post_test"])
    .in(
      "user_id",
      memberRows.map((m) => m.user_id),
    );
  const autoAgg = new Map<
    string,
    { preSum: number; preN: number; postSum: number; postN: number }
  >();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const t of (testResults ?? []) as any[]) {
    const uid = t.user_id as string;
    const raw = Number(t.score);
    const max = Number(t.max_score);
    if (!Number.isFinite(raw)) continue;
    const pct = max > 0 ? (raw / max) * 100 : raw;
    const cur =
      autoAgg.get(uid) ?? { preSum: 0, preN: 0, postSum: 0, postN: 0 };
    if (t.form_type === "pre_test") {
      cur.preSum += pct;
      cur.preN += 1;
    } else if (t.form_type === "post_test") {
      cur.postSum += pct;
      cur.postN += 1;
    }
    autoAgg.set(uid, cur);
  }

  // Kehadiran diturunkan dari check-in per materi (bukan input manual) dan
  // tidak ikut dalam perhitungan Nilai Akhir.
  const matrix = await getProjectCheckinMatrix(projectId);
  const hadirPct = new Map<string, number | null>();
  for (const row of matrix.rows) {
    hadirPct.set(
      row.user_id,
      matrix.total_topik > 0
        ? Math.round((row.checked_count / matrix.total_topik) * 100)
        : null,
    );
  }

  return memberRows.map((m) => {
    const r = raporMap.get(m.user_id);
    const agg = autoAgg.get(m.user_id);
    const autoPre =
      agg && agg.preN > 0 ? Math.round(agg.preSum / agg.preN) : null;
    const autoPost =
      agg && agg.postN > 0 ? Math.round(agg.postSum / agg.postN) : null;
    return {
      ...m,
      pre_test_score: r?.pre_test_score ?? null,
      post_test_score: r?.post_test_score ?? null,
      auto_pre_test_score: autoPre,
      auto_post_test_score: autoPost,
      tugas_score: r?.tugas_score ?? null,
      keaktifan_score: r?.keaktifan_score ?? null,
      final_score: r?.final_score ?? null,
      attendance: hadirPct.get(m.user_id) ?? null,
      improvement_percent: r?.improvement_percent ?? null,
      has_rapor: !!r,
    };
  });
}
