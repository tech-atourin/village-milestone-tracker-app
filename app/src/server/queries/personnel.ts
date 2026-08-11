import "server-only";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export type PersonnelRow = {
  id: string; // project_personnel id
  user_id: string;
  full_name: string;
  email: string | null;
  position: string;
  phone: string | null;
  work_start: string | null;
  work_end: string | null;
  entry_count: number;
};

export type LogbookMedia = {
  id: string;
  url: string | null;
  original_filename: string | null;
};

export type LogbookEntry = {
  id: string;
  entry_date: string;
  agenda: string;
  sort_order: number;
  media: LogbookMedia[];
};

// =====================================================
// Admin: daftar personil dalam sebuah project.
// Pakai admin client (mitra_admin tidak punya RLS read
// policy di project_personnel).
// =====================================================
export async function getProjectPersonnel(
  projectId: string,
): Promise<PersonnelRow[]> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("project_personnel")
    .select(
      "id, user_id, position, phone, work_start, work_end, users:user_id(full_name, email)",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (!rows?.length) return [];

  // Hitung jumlah entri log book per personil.
  const ids = rows.map((r) => r.id as string);
  const { data: counts } = await admin
    .from("personnel_logbook")
    .select("project_personnel_id")
    .in("project_personnel_id", ids);
  const countMap = new Map<string, number>();
  for (const c of counts ?? []) {
    const k = c.project_personnel_id as string;
    countMap.set(k, (countMap.get(k) ?? 0) + 1);
  }

  return rows.map((r) => {
    const u = r.users as unknown as {
      full_name: string;
      email: string | null;
    } | null;
    return {
      id: r.id as string,
      user_id: r.user_id as string,
      full_name: u?.full_name ?? "-",
      email: u?.email ?? null,
      position: r.position as string,
      phone: (r.phone as string | null) ?? null,
      work_start: (r.work_start as string | null) ?? null,
      work_end: (r.work_end as string | null) ?? null,
      entry_count: countMap.get(r.id as string) ?? 0,
    };
  });
}

// =====================================================
// Personil: project_personnel milik user login.
// =====================================================
export async function getMyPersonnel(): Promise<
  {
    id: string;
    project_id: string;
    project_name: string;
    position: string;
    work_start: string | null;
    work_end: string | null;
  }[]
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("project_personnel")
    .select("id, project_id, position, work_start, work_end")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const rows = data ?? [];
  // Nama project di-resolve via admin client (personil tidak punya RLS
  // read policy di tabel projects).
  const projectIds = Array.from(new Set(rows.map((r) => r.project_id as string)));
  const nameMap = new Map<string, string>();
  if (projectIds.length) {
    const admin = createAdminClient();
    const { data: projs } = await admin
      .from("projects")
      .select("id, name")
      .in("id", projectIds);
    for (const p of projs ?? []) {
      nameMap.set(p.id as string, p.name as string);
    }
  }

  return rows.map((r) => ({
    id: r.id as string,
    project_id: r.project_id as string,
    project_name: nameMap.get(r.project_id as string) ?? "Project",
    position: r.position as string,
    work_start: (r.work_start as string | null) ?? null,
    work_end: (r.work_end as string | null) ?? null,
  }));
}

// =====================================================
// Entri log book untuk satu personil, urut tanggal.
// asAdmin=true pakai service role (admin melihat) - kalau
// tidak, pakai RLS client (personil melihat miliknya).
// Media di-serve via signed URL.
// =====================================================
export async function getLogbookForPersonnel(
  projectPersonnelId: string,
  opts?: { asAdmin?: boolean },
): Promise<LogbookEntry[]> {
  const client = opts?.asAdmin ? createAdminClient() : createClient();

  const { data: entries } = await client
    .from("personnel_logbook")
    .select("id, entry_date, agenda, sort_order")
    .eq("project_personnel_id", projectPersonnelId)
    .order("entry_date", { ascending: true })
    .order("sort_order", { ascending: true });

  if (!entries?.length) return [];

  const entryIds = entries.map((e) => e.id as string);
  const { data: media } = await client
    .from("personnel_logbook_media")
    .select("id, logbook_id, file_url, original_filename")
    .in("logbook_id", entryIds);

  // Signed URLs (admin client punya akses penuh ke bucket).
  const signer = createAdminClient();
  const mediaMap = new Map<string, LogbookMedia[]>();
  for (const m of media ?? []) {
    const { data: signed } = await signer.storage
      .from("vmt-evidence")
      .createSignedUrl(m.file_url as string, 60 * 60);
    const k = m.logbook_id as string;
    const arr = mediaMap.get(k) ?? [];
    arr.push({
      id: m.id as string,
      url: signed?.signedUrl ?? null,
      original_filename: (m.original_filename as string | null) ?? null,
    });
    mediaMap.set(k, arr);
  }

  return entries.map((e) => ({
    id: e.id as string,
    entry_date: e.entry_date as string,
    agenda: e.agenda as string,
    sort_order: (e.sort_order as number) ?? 0,
    media: mediaMap.get(e.id as string) ?? [],
  }));
}
