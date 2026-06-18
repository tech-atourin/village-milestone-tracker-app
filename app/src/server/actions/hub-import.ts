"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import { getHubDesaProfile } from "@/server/queries/hub";
import { serverEnv } from "@/lib/env";

// hub-schema client for the extra tables (produk, desa_foto, award, event)
// that aren't covered by getHubDesaProfile.
function hubClient() {
  const env = serverEnv();
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      db: { schema: "hub" },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

/**
 * Mirror Hub-side rich content (produk, foto, awards, events) into
 * vmt.desa_profile_data so the profil desa page can render them without
 * needing a second sync click. Idempotent — safe to call on re-import.
 */
async function upsertHubProfileData(
  vmtDesaId: string,
  hubDesaId: string,
  profile: Awaited<ReturnType<typeof getHubDesaProfile>>,
) {
  if (!profile) return;
  const supabase = createAdminClient();
  const hub = hubClient();

  const [
    { data: produkRows },
    { data: fotoRows },
    { data: awardRows },
    { data: eventRows },
  ] = await Promise.all([
    hub
      .from("produk")
      .select(
        "id, jenis, nama, sub_jenis, harga, deskripsi, image_url, is_available",
      )
      .eq("desa_id", hubDesaId)
      .limit(50),
    hub
      .from("desa_foto")
      .select("id, url, is_cover, urutan")
      .eq("desa_id", hubDesaId)
      .order("urutan", { ascending: true })
      .limit(20),
    hub
      .from("award")
      .select("id, competition_kode, tahun, edisi, kategori, peringkat")
      .eq("desa_id", hubDesaId)
      .order("tahun", { ascending: false })
      .limit(20),
    hub
      .from("event")
      .select("id, judul, deskripsi, mulai, selesai, image_url")
      .eq("desa_id", hubDesaId)
      .order("mulai", { ascending: false })
      .limit(20),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const k = (profile.kontak ?? {}) as any;
  const profileRow = {
    desa_id: vmtDesaId,
    alamat: profile.desa.alamat ?? null,
    cover_image_url: profile.desa.cover_image_url ?? null,
    deskripsi: profile.desa.deskripsi ?? null,
    fasilitas: profile.fasilitas.length > 0 ? profile.fasilitas : null,
    pengelola_kontak_person: k.contact_person ?? null,
    pengelola_email: k.email ?? null,
    pengelola_whatsapp: k.phone ?? null,
    social_website: k.website ?? null,
    social_instagram: k.instagram ?? null,
    produk_list: produkRows && produkRows.length > 0 ? produkRows : null,
    foto_galeri: fotoRows && fotoRows.length > 0 ? fotoRows : null,
    awards: awardRows && awardRows.length > 0 ? awardRows : null,
    events: eventRows && eventRows.length > 0 ? eventRows : null,
    synced_from_hub_at: new Date().toISOString(),
    source: "hub_import",
  };

  const { data: existing } = await supabase
    .from("desa_profile_data")
    .select("desa_id")
    .eq("desa_id", vmtDesaId)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("desa_profile_data")
      .update(profileRow)
      .eq("desa_id", vmtDesaId);
  } else {
    await supabase.from("desa_profile_data").insert(profileRow);
  }
}

const importSchema = z.object({
  project_id: z.string().uuid(),
  hub_desa_id: z.string().uuid(),
});

const KATEGORI_TO_TIER: Record<string, string> = {
  Rintisan: "rintisan",
  Berkembang: "berkembang",
  Maju: "maju",
  Mandiri: "mandiri",
};

export async function importHubDesaToProject(
  input: z.input<typeof importSchema>,
) {
  // Both atourin and mitra project Desa tabs call this; widen guard to mitra.
  await requireRole("superadmin", "mitra_admin");
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const profile = await getHubDesaProfile(parsed.data.hub_desa_id);
  if (!profile) return { error: "Desa di Hub tidak ditemukan" };

  // vmt.desa has no INSERT policy; caller already gates by role above.
  const supabase = createAdminClient();

  // 1. Upsert vmt.desa from hub.desa
  const tier =
    KATEGORI_TO_TIER[profile.desa.kategori ?? ""] ?? "unclassified";
  const { data: existing } = await supabase
    .from("desa")
    .select("id")
    .eq("name", profile.desa.nama)
    .eq("kabupaten", profile.desa.kabupaten ?? "")
    .maybeSingle();

  let vmtDesaId = (existing as { id: string } | null)?.id;
  if (!vmtDesaId) {
    const { data: created, error } = await supabase
      .from("desa")
      .insert({
        name: profile.desa.nama,
        desa_kelurahan: profile.desa.desa_kel,
        kecamatan: profile.desa.kecamatan,
        kabupaten: profile.desa.kabupaten,
        provinsi: profile.desa.provinsi,
        current_classification: tier,
        jadesta_id: profile.desa.slug,
        hub_desa_id: parsed.data.hub_desa_id, // canonical link for later syncs
      })
      .select("id")
      .single();
    if (error || !created) return { error: error?.message ?? "Gagal create desa" };
    vmtDesaId = (created as { id: string }).id;
  } else {
    // Ensure existing row is linked back to hub so future syncs work.
    await supabase
      .from("desa")
      .update({ hub_desa_id: parsed.data.hub_desa_id })
      .eq("id", vmtDesaId)
      .is("hub_desa_id", null);
  }

  // Mirror Hub extras (kontak, fasilitas, produk, foto, awards, events) into
  // desa_profile_data so profil desa is populated immediately after import.
  await upsertHubProfileData(vmtDesaId, parsed.data.hub_desa_id, profile);

  // 2. Attach to project. The attach_desa_to_project RPC hard-codes a
  // vmt.is_superadmin() check that reads auth.uid(), which is null under
  // service_role, so we replicate its logic inline using the admin client.
  // Role guard above already ensures only staff can reach here.
  const { error: pdErr } = await supabase.from("project_desa").upsert(
    {
      project_id: parsed.data.project_id,
      desa_id: vmtDesaId,
      classification_at_start: tier,
      classification_target: null,
      coordinator_user_id: null,
    },
    { onConflict: "project_id,desa_id" },
  );
  if (pdErr) return { error: pdErr.message };
  // Materialize the desa_topik_instance rows for every project_topik so the
  // checklist UI has somewhere to land.
  const { data: pdRow } = await supabase
    .from("project_desa")
    .select("id")
    .eq("project_id", parsed.data.project_id)
    .eq("desa_id", vmtDesaId)
    .maybeSingle();
  const projectDesaIdInner = (pdRow as { id: string } | null)?.id;
  if (projectDesaIdInner) {
    const { data: topiks } = await supabase
      .from("project_topik")
      .select("id")
      .eq("project_id", parsed.data.project_id);
    const rows = ((topiks ?? []) as Array<{ id: string }>).map((t) => ({
      project_desa_id: projectDesaIdInner,
      project_topik_id: t.id,
    }));
    if (rows.length > 0) {
      await supabase
        .from("desa_topik_instance")
        .upsert(rows, { onConflict: "project_desa_id,project_topik_id" });
    }
  }

  // 3. Pre-fill baseline data from hub profile (if no existing baseline)
  const { data: projDesa } = await supabase
    .from("project_desa")
    .select("id")
    .eq("project_id", parsed.data.project_id)
    .eq("desa_id", vmtDesaId)
    .maybeSingle();
  const pdId = (projDesa as { id: string } | null)?.id;
  if (pdId) {
    const { data: hasBaseline } = await supabase
      .from("desa_baseline_data")
      .select("id")
      .eq("project_desa_id", pdId)
      .maybeSingle();
    if (!hasBaseline) {
      // Map Hub profile fields to the ADWI-aligned baseline schema keys
      // (v1.1.0-adwi). Anything that doesn't have a direct ADWI key goes
      // into the meta_* namespace so it's still surfaced when AI assembles
      // context but doesn't clutter the form.
      // Seed the Pencapaian section's `penghargaan` repeater from Hub's
      // riwayat_adwi + awards so the desa doesn't have to re-type history
      // that Hub already knows.
      const penghargaan: Array<Record<string, unknown>> = [];
      for (const r of profile.riwayat_adwi ?? []) {
        if (!r.tahun) continue;
        penghargaan.push({
          nama: "Anugerah Desa Wisata Indonesia (ADWI)",
          lembaga: "Kemenpar",
          tahun: r.tahun,
          peringkat: r.peringkat ?? null,
        });
      }
      for (const a of profile.awards ?? []) {
        if (!a.tahun) continue;
        penghargaan.push({
          nama: a.kompetisi ?? a.kategori ?? "Penghargaan",
          lembaga: null,
          tahun: a.tahun,
          peringkat: a.peringkat ?? a.edisi ?? null,
        });
      }

      const baselineData: Record<string, unknown> = {
        // Informasi Dasar
        kontak_nama: profile.kontak?.contact_person ?? null,
        kontak_hp: profile.kontak?.phone ?? null,
        kontak_email: profile.kontak?.email ?? null,
        // Daya Tarik Wisata
        tematik_desa: profile.desa.deskripsi ?? null,
        kunjungan_tahunan: profile.desa.jumlah_kunjungan ?? null,
        // Kelembagaan
        pendapatan_tahunan: profile.desa.pendapatan ?? null,
        jumlah_warga_terlibat: profile.desa.tenaga_kerja ?? null,
        // Ekonomi Kreatif (proxy: total UMKM count)
        jumlah_kios_ekraf: profile.desa.jumlah_umkm ?? null,
        // Pencapaian (auto-fed from Hub history)
        penghargaan,
        // Meta
        meta_fasilitas: profile.fasilitas,
        _imported_from_hub: true,
        _hub_desa_id: parsed.data.hub_desa_id,
        _imported_at: new Date().toISOString(),
      };

      // Drop null/empty entries to keep the form clean
      for (const k of Object.keys(baselineData)) {
        const v = baselineData[k];
        if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) {
          delete baselineData[k];
        }
      }

      await supabase.from("desa_baseline_data").insert({
        project_desa_id: pdId,
        schema_version: "1.2.0-adwi-jadesta-hub",
        data: baselineData,
      });
    }
  }

  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  return { ok: true, vmt_desa_id: vmtDesaId, pre_filled_baseline: true };
}

// =====================================================
// importHubDesaToMaster - adds a Hub desa into the master
// vmt.desa table without attaching it to any project.
// Used by /atourin/desa "Import dari Hub" flow.
// =====================================================
const importMasterSchema = z.object({
  hub_desa_id: z.string().uuid(),
});

export async function importHubDesaToMaster(
  input: z.input<typeof importMasterSchema>,
): Promise<
  | { ok: true; vmt_desa_id: string; already_existed: boolean }
  | { error: string }
> {
  await requireRole("superadmin");
  const parsed = importMasterSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const profile = await getHubDesaProfile(parsed.data.hub_desa_id);
  if (!profile) return { error: "Desa di Hub tidak ditemukan" };

  // vmt.desa has no INSERT policy; caller already gates by role above.
  const supabase = createAdminClient();
  const tier =
    KATEGORI_TO_TIER[profile.desa.kategori ?? ""] ?? "unclassified";

  const { data: existing } = await supabase
    .from("desa")
    .select("id")
    .eq("name", profile.desa.nama)
    .eq("kabupaten", profile.desa.kabupaten ?? "")
    .maybeSingle();
  if (existing) {
    const existingId = (existing as { id: string }).id;
    await supabase
      .from("desa")
      .update({ hub_desa_id: parsed.data.hub_desa_id })
      .eq("id", existingId)
      .is("hub_desa_id", null);
    await upsertHubProfileData(existingId, parsed.data.hub_desa_id, profile);
    revalidatePath("/atourin/desa");
    return { ok: true, vmt_desa_id: existingId, already_existed: true };
  }

  const { data: created, error } = await supabase
    .from("desa")
    .insert({
      name: profile.desa.nama,
      desa_kelurahan: profile.desa.desa_kel,
      kecamatan: profile.desa.kecamatan,
      kabupaten: profile.desa.kabupaten,
      provinsi: profile.desa.provinsi,
      current_classification: tier,
      jadesta_id: profile.desa.slug,
      hub_desa_id: parsed.data.hub_desa_id,
    })
    .select("id")
    .single();
  if (error || !created)
    return { error: error?.message ?? "Gagal create desa" };

  const newId = (created as { id: string }).id;
  await upsertHubProfileData(newId, parsed.data.hub_desa_id, profile);

  revalidatePath("/atourin/desa");
  return { ok: true, vmt_desa_id: newId, already_existed: false };
}
