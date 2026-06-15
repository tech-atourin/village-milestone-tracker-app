import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export type NarasumberRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  kompetensi: string | null;
  kategori_narasumber: string | null;
  jabatan: string | null;
  instansi: string | null;
  kota: string | null;
  gender: "L" | "P" | null;
  sessions_count: number;
  projects_count: number;
  desa_count: number;
  avg_rating: number | null;
  rating_count: number;
};

export async function listNarasumbersWithStats(): Promise<NarasumberRow[]> {
  const supabase = createAdminClient();
  const { data: users } = await supabase
    .from("users")
    .select(
      "id, full_name, email, phone, kompetensi, kategori_narasumber, jabatan, instansi, kota, gender",
    )
    .eq("global_role", "narasumber")
    .is("deleted_at", null);

  const rows = (users ?? []) as Array<{
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    kompetensi: string | null;
    kategori_narasumber: string | null;
    jabatan: string | null;
    instansi: string | null;
    kota: string | null;
    gender: "L" | "P" | null;
  }>;
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  // Sessions count + distinct project_desa per narasumber
  const { data: sessions } = await supabase
    .from("pendampingan_sessions")
    .select("narasumber_id, project_id, project_desa_id")
    .in("narasumber_id", ids);
  const sCount = new Map<string, number>();
  const pSet = new Map<string, Set<string>>();
  const dSet = new Map<string, Set<string>>();
  for (const s of (sessions ?? []) as Array<{
    narasumber_id: string;
    project_id: string;
    project_desa_id: string;
  }>) {
    sCount.set(s.narasumber_id, (sCount.get(s.narasumber_id) ?? 0) + 1);
    if (!pSet.has(s.narasumber_id)) pSet.set(s.narasumber_id, new Set());
    pSet.get(s.narasumber_id)!.add(s.project_id);
    if (!dSet.has(s.narasumber_id)) dSet.set(s.narasumber_id, new Set());
    dSet.get(s.narasumber_id)!.add(s.project_desa_id);
  }

  // Ratings: avg + count per narasumber
  const { data: ratings } = await supabase
    .from("narasumber_ratings")
    .select("narasumber_id, rating")
    .in("narasumber_id", ids);
  const rSum = new Map<string, number>();
  const rCount = new Map<string, number>();
  for (const r of (ratings ?? []) as Array<{
    narasumber_id: string;
    rating: number;
  }>) {
    rSum.set(r.narasumber_id, (rSum.get(r.narasumber_id) ?? 0) + r.rating);
    rCount.set(r.narasumber_id, (rCount.get(r.narasumber_id) ?? 0) + 1);
  }

  return rows.map((r) => {
    const cnt = rCount.get(r.id) ?? 0;
    return {
      ...r,
      sessions_count: sCount.get(r.id) ?? 0,
      projects_count: pSet.get(r.id)?.size ?? 0,
      desa_count: dSet.get(r.id)?.size ?? 0,
      avg_rating: cnt > 0 ? Math.round((rSum.get(r.id)! / cnt) * 10) / 10 : null,
      rating_count: cnt,
    };
  });
}

export type NarasumberRiwayatEntry = {
  project_id: string;
  project_name: string;
  period_start: string | null;
  period_end: string | null;
  status: string;
  sessions_count: number;
  desa_names: string[];
};

export type NarasumberDetail = NarasumberRow & {
  birthdate: string | null;
  riwayat: NarasumberRiwayatEntry[];
};

export async function getNarasumberDetail(
  id: string,
): Promise<NarasumberDetail | null> {
  const supabase = createAdminClient();
  const { data: u } = await supabase
    .from("users")
    .select(
      "id, full_name, email, phone, kompetensi, kategori_narasumber, jabatan, instansi, kota, gender, birthdate",
    )
    .eq("id", id)
    .eq("global_role", "narasumber")
    .maybeSingle();
  if (!u) return null;

  const list = await listNarasumbersWithStats();
  const stats = list.find((r) => r.id === id);
  if (!stats) return null;

  // Riwayat: group sessions by project
  const { data: sessions } = await supabase
    .from("pendampingan_sessions")
    .select(
      "project_id, project_desa_id, project:projects(name, period_start, period_end, status), project_desa:project_desa(desa:desa(name))",
    )
    .eq("narasumber_id", id);

  const projMap = new Map<
    string,
    {
      project_id: string;
      project_name: string;
      period_start: string | null;
      period_end: string | null;
      status: string;
      sessions_count: number;
      desa_set: Set<string>;
    }
  >();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of (sessions ?? []) as any[]) {
    const existing = projMap.get(s.project_id) ?? {
      project_id: s.project_id,
      project_name: s.project?.name ?? "—",
      period_start: s.project?.period_start ?? null,
      period_end: s.project?.period_end ?? null,
      status: s.project?.status ?? "—",
      sessions_count: 0,
      desa_set: new Set<string>(),
    };
    existing.sessions_count++;
    const desaName = s.project_desa?.desa?.name;
    if (desaName) existing.desa_set.add(desaName);
    projMap.set(s.project_id, existing);
  }
  const riwayat = Array.from(projMap.values())
    .map((p) => ({
      project_id: p.project_id,
      project_name: p.project_name,
      period_start: p.period_start,
      period_end: p.period_end,
      status: p.status,
      sessions_count: p.sessions_count,
      desa_names: Array.from(p.desa_set),
    }))
    .sort((a, b) =>
      (b.period_start ?? "").localeCompare(a.period_start ?? ""),
    );

  const detail: NarasumberDetail = {
    ...stats,
    birthdate: (u as { birthdate: string | null }).birthdate ?? null,
    riwayat,
  };
  return detail;
}
