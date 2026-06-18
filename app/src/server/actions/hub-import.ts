"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import { getHubDesaProfile } from "@/server/queries/hub";

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
  await requireRole("superadmin");
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const profile = await getHubDesaProfile(parsed.data.hub_desa_id);
  if (!profile) return { error: "Desa di Hub tidak ditemukan" };

  const supabase = createClient();

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
        jadesta_id: profile.desa.slug, // store slug as external id
      })
      .select("id")
      .single();
    if (error || !created) return { error: error?.message ?? "Gagal create desa" };
    vmtDesaId = (created as { id: string }).id;
  }

  // 2. Attach to project via RPC
  const { error: attachErr } = await supabase.rpc("attach_desa_to_project", {
    p_project_id: parsed.data.project_id,
    p_desa_id: vmtDesaId,
    p_classification_at_start: tier,
    p_classification_target: null,
    p_coordinator_user_id: null,
  });
  if (attachErr) return { error: attachErr.message };

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
      const baselineData: Record<string, unknown> = {
        // Informasi Dasar
        kontak_nama: profile.kontak?.contact_person ?? null,
        kontak_hp: profile.kontak?.phone ?? null,
        kontak_email: profile.kontak?.email ?? null,
        // Atraksi
        tematik_desa: profile.desa.deskripsi ?? null,
        kunjungan_tahunan: profile.desa.jumlah_kunjungan ?? null,
        // Masyarakat
        pendapatan_tahunan: profile.desa.pendapatan ?? null,
        jumlah_warga_terlibat: profile.desa.tenaga_kerja ?? null,
        // Industri & Ekraf
        jumlah_kios_ekraf: profile.desa.jumlah_umkm ?? null,
        // Meta
        meta_fasilitas: profile.fasilitas,
        meta_adwi_history: profile.riwayat_adwi.map(
          (r) => `${r.tahun}: ${r.peringkat ?? "-"}`,
        ),
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
        schema_version: "1.1.0-adwi-hub",
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

  const supabase = createClient();
  const tier =
    KATEGORI_TO_TIER[profile.desa.kategori ?? ""] ?? "unclassified";

  const { data: existing } = await supabase
    .from("desa")
    .select("id")
    .eq("name", profile.desa.nama)
    .eq("kabupaten", profile.desa.kabupaten ?? "")
    .maybeSingle();
  if (existing) {
    revalidatePath("/atourin/desa");
    return {
      ok: true,
      vmt_desa_id: (existing as { id: string }).id,
      already_existed: true,
    };
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
    })
    .select("id")
    .single();
  if (error || !created)
    return { error: error?.message ?? "Gagal create desa" };

  revalidatePath("/atourin/desa");
  return {
    ok: true,
    vmt_desa_id: (created as { id: string }).id,
    already_existed: false,
  };
}
