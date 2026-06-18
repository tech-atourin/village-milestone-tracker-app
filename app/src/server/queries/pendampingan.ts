import "server-only";

import { createClient } from "@/lib/supabase/server";

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
  const supabase = createClient();
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
    project_name: r.project?.name ?? "—",
    project_desa_id: r.project_desa_id,
    desa_id: r.project_desa?.desa_id ?? "",
    desa_name: r.project_desa?.desa?.name ?? "—",
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
  desa: Array<{ project_desa_id: string; desa_id: string; desa_name: string }>;
};

export async function listNarasumberProjects(
  narasumberId: string,
): Promise<ProjectScope[]> {
  const supabase = createClient();
  const { data: m } = await supabase
    .from("project_memberships")
    .select("project_id, project:projects(id, name, total_pendampingan_days)")
    .eq("user_id", narasumberId)
    .eq("role", "narasumber")
    .eq("status", "active");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projects = ((m ?? []) as any[])
    .map((r) => r.project)
    .filter(Boolean);

  if (projects.length === 0) return [];

  const projectIds = projects.map((p: { id: string }) => p.id);
  const { data: pdRows } = await supabase
    .from("project_desa")
    .select("id, project_id, desa_id, desa:desa(name)")
    .in("project_id", projectIds);

  const desaByProject = new Map<
    string,
    Array<{ project_desa_id: string; desa_id: string; desa_name: string }>
  >();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (pdRows ?? []) as any[]) {
    const arr = desaByProject.get(r.project_id) ?? [];
    arr.push({
      project_desa_id: r.id,
      desa_id: r.desa_id,
      desa_name: r.desa?.name ?? "—",
    });
    desaByProject.set(r.project_id, arr);
  }

  return projects.map((p: { id: string; name: string; total_pendampingan_days: number }) => ({
    id: p.id,
    name: p.name,
    total_pendampingan_days: p.total_pendampingan_days,
    desa: desaByProject.get(p.id) ?? [],
  }));
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
  aktivitas: string | null;
  output_sesi: string | null;
  tindak_lanjut: string | null;
  kondisi_sebelum: string[] | null;
  kondisi_setelah: string[] | null;
  rekomendasi: string | null;
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
  const supabase = createClient();
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
    full_name: a.user?.full_name ?? "—",
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
    project_name: r.project?.name ?? "—",
    project_desa_id: r.project_desa_id,
    desa_name: r.project_desa?.desa?.name ?? "—",
    kabupaten: r.project_desa?.desa?.kabupaten ?? null,
    provinsi: r.project_desa?.desa?.provinsi ?? null,
    narasumber_id: r.narasumber_id,
    narasumber_name: r.narasumber?.full_name ?? "—",
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
  const supabase = createClient();
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
