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
  topiks: Array<{
    name: string;
    sessions: number;
    avg_rating: number | null;
    rating_count: number;
  }>;
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

  // Riwayat: group sessions by project, then by materi inside each project
  const { data: sessions } = await supabase
    .from("pendampingan_sessions")
    .select(
      "project_id, project_desa_id, materi, project:projects(name, period_start, period_end, status), project_desa:project_desa(desa:desa(name))",
    )
    .eq("narasumber_id", id);

  // Ratings narasumber received, scoped per project (and per topik when set)
  const { data: ratings } = await supabase
    .from("narasumber_ratings")
    .select(
      "project_id, project_topik_id, rating, project_topik:project_topik(name)",
    )
    .eq("narasumber_id", id);
  // ratings keyed by `${project_id}::${topikName}` and a project-wide fallback
  const ratingByProjectTopik = new Map<string, { sum: number; count: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (ratings ?? []) as any[]) {
    const topikName = r.project_topik?.name ?? null;
    if (!topikName) continue; // un-topik'd ratings only feed the project-level avg
    const k = `${r.project_id}::${topikName}`;
    const cur = ratingByProjectTopik.get(k) ?? { sum: 0, count: 0 };
    cur.sum += Number(r.rating) || 0;
    cur.count += 1;
    ratingByProjectTopik.set(k, cur);
  }

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
      materi_count: Map<string, number>;
    }
  >();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of (sessions ?? []) as any[]) {
    const existing = projMap.get(s.project_id) ?? {
      project_id: s.project_id,
      project_name: s.project?.name ?? "-",
      period_start: s.project?.period_start ?? null,
      period_end: s.project?.period_end ?? null,
      status: s.project?.status ?? "-",
      sessions_count: 0,
      desa_set: new Set<string>(),
      materi_count: new Map<string, number>(),
    };
    existing.sessions_count++;
    const desaName = s.project_desa?.desa?.name;
    if (desaName) existing.desa_set.add(desaName);
    const materi = (s.materi as string | null)?.trim();
    if (materi) {
      existing.materi_count.set(
        materi,
        (existing.materi_count.get(materi) ?? 0) + 1,
      );
    }
    projMap.set(s.project_id, existing);
  }
  const riwayat = Array.from(projMap.values())
    .map((p) => {
      const topiks: Array<{
        name: string;
        sessions: number;
        avg_rating: number | null;
        rating_count: number;
      }> = [];
      p.materi_count.forEach((sessions, name) => {
        const r = ratingByProjectTopik.get(`${p.project_id}::${name}`);
        topiks.push({
          name,
          sessions,
          avg_rating: r && r.count > 0 ? r.sum / r.count : null,
          rating_count: r?.count ?? 0,
        });
      });
      topiks.sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name));
      return {
        project_id: p.project_id,
        project_name: p.project_name,
        period_start: p.period_start,
        period_end: p.period_end,
        status: p.status,
        sessions_count: p.sessions_count,
        desa_names: Array.from(p.desa_set),
        topiks,
      };
    })
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
