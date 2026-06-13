import "server-only";

import { createClient } from "@/lib/supabase/server";

export type DesaListRow = {
  id: string;
  name: string;
  desa_kelurahan: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  provinsi: string | null;
  current_classification: string | null;
  hub_desa_id: string | null;
  jadesta_id: string | null;
  has_baseline: boolean;
  has_hub_assessment: boolean;
  pengelola_email: string | null;
  pengelola_whatsapp: string | null;
  project_count: number;
};

export async function listAllDesa(opts: {
  scopeProjectIds?: string[];
} = {}): Promise<DesaListRow[]> {
  const supabase = createClient();
  let q = supabase
    .from("desa")
    .select(
      "id, name, desa_kelurahan, kecamatan, kabupaten, provinsi, current_classification, hub_desa_id, jadesta_id",
    )
    .is("deleted_at", null)
    .order("name");

  // Atourin sees all; mitra scoped by project_desa
  let scopedDesaIds: string[] | null = null;
  if (opts.scopeProjectIds && opts.scopeProjectIds.length > 0) {
    const { data: pd } = await supabase
      .from("project_desa")
      .select("desa_id")
      .in("project_id", opts.scopeProjectIds);
    scopedDesaIds = Array.from(
      new Set(((pd ?? []) as Array<{ desa_id: string }>).map((r) => r.desa_id)),
    );
    if (scopedDesaIds.length === 0) return [];
    q = q.in("id", scopedDesaIds);
  }

  const { data } = await q;
  const rows = (data ?? []) as Array<{
    id: string;
    name: string;
    desa_kelurahan: string | null;
    kecamatan: string | null;
    kabupaten: string | null;
    provinsi: string | null;
    current_classification: string | null;
    hub_desa_id: string | null;
    jadesta_id: string | null;
  }>;
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  // Profile data
  const { data: profiles } = await supabase
    .from("desa_profile_data")
    .select("desa_id, pengelola_email, pengelola_whatsapp")
    .in("desa_id", ids);
  const profileMap = new Map(
    (profiles ?? []).map((p) => {
      const r = p as {
        desa_id: string;
        pengelola_email: string | null;
        pengelola_whatsapp: string | null;
      };
      return [r.desa_id, { email: r.pengelola_email, wa: r.pengelola_whatsapp }];
    }),
  );

  // Baseline presence
  const { data: pdAll } = await supabase
    .from("project_desa")
    .select("id, desa_id, project_id")
    .in("desa_id", ids);
  const pdByDesa = new Map<string, Array<{ id: string; project_id: string }>>();
  for (const p of (pdAll ?? []) as Array<{
    id: string;
    desa_id: string;
    project_id: string;
  }>) {
    const arr = pdByDesa.get(p.desa_id) ?? [];
    arr.push({ id: p.id, project_id: p.project_id });
    pdByDesa.set(p.desa_id, arr);
  }

  const allPdIds = (pdAll ?? []).map((p) => (p as { id: string }).id);
  const baselineByPd = new Set<string>();
  if (allPdIds.length > 0) {
    const { data: bl } = await supabase
      .from("desa_baseline_data")
      .select("project_desa_id")
      .in("project_desa_id", allPdIds);
    for (const b of (bl ?? []) as Array<{ project_desa_id: string }>) {
      baselineByPd.add(b.project_desa_id);
    }
  }

  // Hub assessment presence
  const { data: hub } = await supabase
    .from("hub_assessment")
    .select("desa_id")
    .in("desa_id", ids);
  const hubSet = new Set(
    (hub ?? []).map((h) => (h as { desa_id: string }).desa_id),
  );

  return rows.map((r) => {
    const pds = pdByDesa.get(r.id) ?? [];
    const hasBaseline = pds.some((p) => baselineByPd.has(p.id));
    const projectCount = new Set(pds.map((p) => p.project_id)).size;
    const p = profileMap.get(r.id);
    return {
      ...r,
      has_baseline: hasBaseline,
      has_hub_assessment: hubSet.has(r.id),
      pengelola_email: p?.email ?? null,
      pengelola_whatsapp: p?.wa ?? null,
      project_count: projectCount,
    };
  });
}

// Detail loader — full sections
export type DesaDetail = {
  base: DesaListRow;
  profile: {
    alamat: string | null;
    cover_image_url: string | null;
    deskripsi: string | null;
    keunikan: string | null;
    rekomendasi_kunjungan: string | null;
    fasilitas: string[] | null;
    pengelola_nama: string | null;
    pengelola_kontak_person: string | null;
    pengelola_email: string | null;
    pengelola_whatsapp: string | null;
    social_website: string | null;
    social_instagram: string | null;
    social_facebook: string | null;
    social_youtube: string | null;
    synced_from_hub_at: string | null;
    // Hub extras (raw jsonb from sync)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    produk_list: any[] | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    foto_galeri: any[] | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    awards: any[] | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events: any[] | null;
  } | null;
  pengelola: {
    bentuk_kelembagaan: string | null;
    landasan_pembentukan: string | null;
    nomor_sk: string | null;
    tanggal_sk: string | null;
    total_pengurus: number | null;
    total_pengurus_p: number | null;
    rating_kemandirian: number | null;
    rating_keberlanjutan: number | null;
    rating_inovasi: number | null;
    jaringan_kerjasama: string[] | null;
    catatan: string | null;
  } | null;
  baseline: Record<string, unknown> | null;
  baseline_submitted_at: string | null;
  hub_assessment: {
    skor_total: number | null;
    level_hasil: string | null;
    status: string;
    submitted_at: string | null;
  } | null;
  projects: Array<{
    project_id: string;
    project_name: string;
    period_start: string | null;
    period_end: string | null;
    status: string;
    peserta_count: number;
  }>;
};

export async function getDesaDetail(
  desaId: string,
): Promise<DesaDetail | null> {
  const supabase = createClient();
  const list = await listAllDesa();
  const base = list.find((r) => r.id === desaId);
  if (!base) return null;

  const { data: profile } = await supabase
    .from("desa_profile_data")
    .select(
      "alamat, cover_image_url, deskripsi, keunikan, rekomendasi_kunjungan, fasilitas, pengelola_nama, pengelola_kontak_person, pengelola_email, pengelola_whatsapp, social_website, social_instagram, social_facebook, social_youtube, synced_from_hub_at, produk_list, foto_galeri, awards, events",
    )
    .eq("desa_id", desaId)
    .maybeSingle();

  const { data: pengelola } = await supabase
    .from("desa_pengelola_data")
    .select(
      "bentuk_kelembagaan, landasan_pembentukan, nomor_sk, tanggal_sk, total_pengurus, total_pengurus_p, rating_kemandirian, rating_keberlanjutan, rating_inovasi, jaringan_kerjasama, catatan",
    )
    .eq("desa_id", desaId)
    .maybeSingle();

  // Latest baseline across any project_desa
  const { data: pdRows } = await supabase
    .from("project_desa")
    .select("id, project_id, project:projects(id, name, period_start, period_end, status)")
    .eq("desa_id", desaId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pds = (pdRows ?? []) as any[];
  const pdIds = pds.map((p) => p.id);
  let baseline: Record<string, unknown> | null = null;
  let baseline_submitted_at: string | null = null;
  if (pdIds.length > 0) {
    const { data: bRow } = await supabase
      .from("desa_baseline_data")
      .select("data, submitted_at, updated_at")
      .in("project_desa_id", pdIds)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (bRow) {
      const b = bRow as {
        data: Record<string, unknown>;
        submitted_at: string | null;
      };
      baseline = b.data;
      baseline_submitted_at = b.submitted_at;
    }
  }

  // Hub assessment
  const { data: hubA } = await supabase
    .from("hub_assessment")
    .select("skor_total, level_hasil, status, submitted_at")
    .eq("desa_id", desaId)
    .maybeSingle();

  // Project list with peserta count
  const projectIds = pds.map((p) => p.project_id);
  const pesertaByProject = new Map<string, number>();
  if (projectIds.length > 0) {
    const { data: pm } = await supabase
      .from("project_memberships")
      .select("project_id, user_id")
      .in("project_id", projectIds)
      .eq("desa_id", desaId)
      .eq("role", "peserta")
      .eq("status", "active");
    for (const p of (pm ?? []) as Array<{ project_id: string; user_id: string }>) {
      pesertaByProject.set(
        p.project_id,
        (pesertaByProject.get(p.project_id) ?? 0) + 1,
      );
    }
  }

  const projects = pds.map((p) => ({
    project_id: p.project_id as string,
    project_name: (p.project?.name as string) ?? "—",
    period_start: (p.project?.period_start as string) ?? null,
    period_end: (p.project?.period_end as string) ?? null,
    status: (p.project?.status as string) ?? "—",
    peserta_count: pesertaByProject.get(p.project_id as string) ?? 0,
  }));

  return {
    base,
    profile: profile as DesaDetail["profile"],
    pengelola: pengelola as DesaDetail["pengelola"],
    baseline,
    baseline_submitted_at,
    hub_assessment: hubA as DesaDetail["hub_assessment"],
    projects,
  };
}
