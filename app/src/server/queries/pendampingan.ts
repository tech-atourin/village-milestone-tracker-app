import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export type SessionRow = {
  id: string;
  project_id: string;
  project_name: string;
  project_desa_id: string;
  desa_id: string;
  desa_name: string;
  day_number: number;
  session_date: string;
  materi: string | null;
  status: "draft" | "submitted" | "verified";
};

export async function listNarasumberSessions(
  narasumberId: string,
): Promise<SessionRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("pendampingan_sessions")
    .select(
      "id, project_id, project_desa_id, day_number, session_date, materi, status, project:projects(name), project_desa:project_desa(desa_id, desa:desa(name))",
    )
    .eq("narasumber_id", narasumberId)
    .order("session_date", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    project_id: r.project_id,
    project_name: r.project?.name ?? "-",
    project_desa_id: r.project_desa_id,
    desa_id: r.project_desa?.desa_id ?? "",
    desa_name: r.project_desa?.desa?.name ?? "-",
    day_number: r.day_number,
    session_date: r.session_date,
    materi: r.materi,
    status: r.status,
  }));
}

export type ProjectScope = {
  id: string;
  name: string;
  total_pendampingan_days: number;
  program_type: "desa_based" | "pelaku_pariwisata";
  desa: Array<{ project_desa_id: string; desa_id: string; desa_name: string }>;
};

export async function listNarasumberProjects(
  narasumberId: string,
): Promise<ProjectScope[]> {
  const supabase = createAdminClient();
  const { data: m } = await supabase
    .from("project_memberships")
    .select(
      "project_id, desa_id, project:projects(id, name, total_pendampingan_days, program_type)",
    )
    .eq("user_id", narasumberId)
    .eq("role", "narasumber")
    .eq("status", "active");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((m ?? []) as any[]).filter((r) => r.project);
  if (rows.length === 0) return [];

  // Per-project: set of desa_ids the narasumber is scoped to.
  // - desa_id non-null on any row → scope is the union of those desa
  // - all rows null → fallback to desa where narasumber has actual sessions
  // - no sessions either → truly project-wide (show all desa)
  const projectScope = new Map<string, { project: { id: string; name: string; total_pendampingan_days: number }; explicitDesa: Set<string>; allNull: boolean }>();
  for (const r of rows) {
    const entry = projectScope.get(r.project_id) ?? {
      project: r.project,
      explicitDesa: new Set<string>(),
      allNull: true,
    };
    if (r.desa_id) {
      entry.explicitDesa.add(r.desa_id);
      entry.allNull = false;
    }
    projectScope.set(r.project_id, entry);
  }

  const projectIds = Array.from(projectScope.keys());
  // Fallback: actual sessions held by this narasumber per project, mapped to desa
  const { data: sessRows } = await supabase
    .from("pendampingan_sessions")
    .select("project_id, project_desa:project_desa(desa_id)")
    .eq("narasumber_id", narasumberId)
    .in("project_id", projectIds);
  const sessionDesaByProject = new Map<string, Set<string>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of ((sessRows ?? []) as any[])) {
    const did = r.project_desa?.desa_id;
    if (!did) continue;
    const s = sessionDesaByProject.get(r.project_id) ?? new Set<string>();
    s.add(did);
    sessionDesaByProject.set(r.project_id, s);
  }

  const { data: pdRows } = await supabase
    .from("project_desa")
    .select("id, project_id, desa_id, desa:desa(name)")
    .in("project_id", projectIds);

  const allDesaByProject = new Map<
    string,
    Array<{ project_desa_id: string; desa_id: string; desa_name: string }>
  >();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (pdRows ?? []) as any[]) {
    const arr = allDesaByProject.get(r.project_id) ?? [];
    arr.push({
      project_desa_id: r.id,
      desa_id: r.desa_id,
      desa_name: r.desa?.name ?? "-",
    });
    allDesaByProject.set(r.project_id, arr);
  }

  const result: ProjectScope[] = [];
  projectScope.forEach((entry, pid) => {
    const allDesa = allDesaByProject.get(pid) ?? [];
    let filtered = allDesa;
    if (entry.explicitDesa.size > 0) {
      filtered = allDesa.filter((d) => entry.explicitDesa.has(d.desa_id));
    } else if (entry.allNull) {
      const sessDesa = sessionDesaByProject.get(pid);
      if (sessDesa && sessDesa.size > 0) {
        filtered = allDesa.filter((d) => sessDesa.has(d.desa_id));
      }
    }
    result.push({
      id: entry.project.id,
      name: entry.project.name,
      total_pendampingan_days: entry.project.total_pendampingan_days,
      program_type:
        ((entry.project as { program_type?: string }).program_type ??
          "desa_based") as "desa_based" | "pelaku_pariwisata",
      desa: filtered,
    });
  });
  return result;
}

// Helper: per-project, returns the set of desa_ids that this narasumber is
// scoped to. Same semantics as listNarasumberProjects (explicit memberships,
// else session-based, else all desa in the project). Returns null when the
// narasumber should see all desa in that project.
export async function narasumberDesaScope(
  narasumberId: string,
  projectId: string,
): Promise<Set<string> | null> {
  const supabase = createAdminClient();
  const { data: m } = await supabase
    .from("project_memberships")
    .select("desa_id")
    .eq("user_id", narasumberId)
    .eq("project_id", projectId)
    .eq("role", "narasumber")
    .eq("status", "active");
  const rows = (m ?? []) as Array<{ desa_id: string | null }>;
  const explicit = new Set<string>();
  let hasNull = false;
  for (const r of rows) {
    if (r.desa_id) explicit.add(r.desa_id);
    else hasNull = true;
  }
  if (explicit.size > 0) return explicit;
  if (!hasNull) return new Set();
  // Project-wide membership → fall back to desa from actual sessions
  const { data: s } = await supabase
    .from("pendampingan_sessions")
    .select("project_desa:project_desa(desa_id)")
    .eq("narasumber_id", narasumberId)
    .eq("project_id", projectId);
  const set = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of ((s ?? []) as any[])) {
    const did = r.project_desa?.desa_id;
    if (did) set.add(did);
  }
  if (set.size > 0) return set;
  return null; // truly project-wide
}

export type SessionDetail = {
  id: string;
  project_id: string;
  project_name: string;
  project_desa_id: string;
  desa_name: string;
  kabupaten: string | null;
  provinsi: string | null;
  narasumber_id: string;
  narasumber_name: string;
  day_number: number;
  total_days: number;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  materi: string | null;
  maksud_tujuan: string | null;
  aktivitas: string[] | null;
  output_sesi: string[] | null;
  tindak_lanjut: string[] | null;
  kondisi_sebelum: string[] | null;
  kondisi_setelah: string[] | null;
  rekomendasi: string[] | null;
  status: "draft" | "submitted" | "verified";
  attendance: Array<{
    user_id: string;
    full_name: string;
    jabatan: string | null;
    gender: "L" | "P" | null;
    status: "hadir" | "izin" | "sakit" | "tidak_hadir";
    note: string | null;
  }>;
  evidence_paths: string[];
};

export async function getSessionDetail(
  sessionId: string,
): Promise<SessionDetail | null> {
  const supabase = createAdminClient();
  const { data: s } = await supabase
    .from("pendampingan_sessions")
    .select(
      `
      id, project_id, project_desa_id, narasumber_id, day_number, session_date,
      start_time, end_time, materi, maksud_tujuan, aktivitas, output_sesi,
      tindak_lanjut, kondisi_sebelum, kondisi_setelah,
      rekomendasi, status,
      project:projects(name, total_pendampingan_days),
      project_desa:project_desa(desa:desa(name, kabupaten, provinsi)),
      narasumber:users!pendampingan_sessions_narasumber_id_fkey(full_name)
      `,
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (!s) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = s as any;

  const { data: attRaw } = await supabase
    .from("pendampingan_attendance")
    .select("user_id, status, note, user:users!pendampingan_attendance_user_id_fkey(full_name, jabatan, gender)")
    .eq("session_id", sessionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attendance = ((attRaw ?? []) as any[]).map((a) => ({
    user_id: a.user_id,
    full_name: a.user?.full_name ?? "-",
    jabatan: a.user?.jabatan ?? null,
    gender: a.user?.gender ?? null,
    status: a.status,
    note: a.note,
  }));

  // Evidence files tagged to this session via evidence_tags
  const { data: evTags } = await supabase
    .from("evidence_tags")
    .select("evidence:evidence_files(file_url)")
    .eq("tag_type", "pendampingan_session")
    .eq("tag_target_id", sessionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const evidence_paths = ((evTags ?? []) as any[])
    .map((e) => e.evidence?.file_url)
    .filter(Boolean) as string[];

  return {
    id: r.id,
    project_id: r.project_id,
    project_name: r.project?.name ?? "-",
    project_desa_id: r.project_desa_id,
    desa_name: r.project_desa?.desa?.name ?? "-",
    kabupaten: r.project_desa?.desa?.kabupaten ?? null,
    provinsi: r.project_desa?.desa?.provinsi ?? null,
    narasumber_id: r.narasumber_id,
    narasumber_name: r.narasumber?.full_name ?? "-",
    day_number: r.day_number,
    total_days: r.project?.total_pendampingan_days ?? 5,
    session_date: r.session_date,
    start_time: r.start_time,
    end_time: r.end_time,
    materi: r.materi,
    maksud_tujuan: r.maksud_tujuan,
    aktivitas: r.aktivitas,
    output_sesi: r.output_sesi,
    tindak_lanjut: r.tindak_lanjut,
    kondisi_sebelum: r.kondisi_sebelum,
    kondisi_setelah: r.kondisi_setelah,
    rekomendasi: r.rekomendasi,
    status: r.status,
    attendance,
    evidence_paths,
  };
}

// Group sessions across all days for one project_desa (for the 4-tab view)
export async function getProjectDesaSessions(projectDesaId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("pendampingan_sessions")
    .select("id, day_number, session_date, materi, tindak_lanjut, status")
    .eq("project_desa_id", projectDesaId)
    .order("day_number", { ascending: true });
  return (data ?? []) as Array<{
    id: string;
    day_number: number;
    session_date: string;
    materi: string | null;
    tindak_lanjut: string | null;
    status: "draft" | "submitted" | "verified";
  }>;
}
