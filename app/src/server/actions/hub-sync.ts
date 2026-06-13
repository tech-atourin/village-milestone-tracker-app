"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

// =====================================================
// Service-role client for cross-schema (hub) read
// =====================================================
function hubClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseClient(url, key, {
    db: { schema: "hub" },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// =====================================================
// Map hub.desa.kategori → vmt.desa.current_classification
// =====================================================
const KATEGORI_MAP: Record<string, "rintisan" | "berkembang" | "maju" | "mandiri"> = {
  Rintisan: "rintisan",
  Berkembang: "berkembang",
  Maju: "maju",
  Mandiri: "mandiri",
};

const syncSchema = z.object({
  desa_id: z.string().uuid(),
});

export async function syncDesaFromHub(input: z.input<typeof syncSchema>) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = syncSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const supabase = createClient();

  // 1) Resolve hub_desa_id from vmt.desa
  const { data: vmtDesa } = await supabase
    .from("desa")
    .select("id, hub_desa_id, name")
    .eq("id", parsed.data.desa_id)
    .maybeSingle();
  const row = vmtDesa as {
    id: string;
    hub_desa_id: string | null;
    name: string;
  } | null;
  if (!row) return { error: "Desa tidak ditemukan" };
  if (!row.hub_desa_id)
    return {
      error: `Desa "${row.name}" belum di-link ke hub. Hubungi admin untuk linking manual.`,
    };

  // 2) Read from hub
  const hub = hubClient();
  const { data: hubDesaRaw, error: hubErr } = await hub
    .from("desa")
    .select(
      "id, nama, kategori, alamat, desa_kel, kecamatan, kabupaten, provinsi, deskripsi, cover_image_url, jumlah_kunjungan, jumlah_umkm, tenaga_kerja, pendapatan",
    )
    .eq("id", row.hub_desa_id)
    .maybeSingle();
  if (hubErr || !hubDesaRaw) {
    return { error: `Data hub tidak ditemukan: ${hubErr?.message ?? "kosong"}` };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h = hubDesaRaw as any;

  // 3) Read kontak + fasilitas from hub
  const { data: kontakRows } = await hub
    .from("kontak")
    .select(
      "contact_person, phone, phone_e164, email, website, instagram, facebook, twitter",
    )
    .eq("desa_id", row.hub_desa_id)
    .limit(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const k = ((kontakRows ?? [])[0] as any) ?? {};

  const { data: fasilitasRows } = await hub
    .from("desa_fasilitas")
    .select("fasilitas:fasilitas(nama)")
    .eq("desa_id", row.hub_desa_id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fasilitasArr = ((fasilitasRows ?? []) as any[])
    .map((r) => r.fasilitas?.nama as string | null)
    .filter(Boolean) as string[];

  // Extended hub data: produk, foto, award, event
  const [
    { data: produkRows },
    { data: fotoRows },
    { data: awardRows },
    { data: eventRows },
  ] = await Promise.all([
    hub
      .from("produk")
      .select("id, jenis, nama, sub_jenis, harga, deskripsi, image_url, is_available")
      .eq("desa_id", row.hub_desa_id)
      .limit(50),
    hub
      .from("desa_foto")
      .select("id, url, is_cover, urutan")
      .eq("desa_id", row.hub_desa_id)
      .order("urutan", { ascending: true })
      .limit(20),
    hub
      .from("award")
      .select("id, tahun, edisi, kategori, peringkat")
      .eq("desa_id", row.hub_desa_id)
      .order("tahun", { ascending: false })
      .limit(20),
    hub
      .from("event")
      .select("id, judul, deskripsi, mulai, selesai, image_url")
      .eq("desa_id", row.hub_desa_id)
      .order("mulai", { ascending: false })
      .limit(20),
  ]);

  // 4) Push to vmt.desa core fields
  const newClassification =
    h.kategori && KATEGORI_MAP[h.kategori]
      ? KATEGORI_MAP[h.kategori]
      : undefined;
  const vmtUpdates: Record<string, unknown> = {
    name: h.nama,
    desa_kelurahan: h.desa_kel,
    kecamatan: h.kecamatan,
    kabupaten: h.kabupaten,
    provinsi: h.provinsi,
  };
  if (newClassification) {
    vmtUpdates.current_classification = newClassification;
    vmtUpdates.classification_updated_at = new Date().toISOString();
  }
  await supabase.from("desa").update(vmtUpdates).eq("id", row.id);

  // 5) Upsert vmt.desa_profile_data
  const profileRow = {
    desa_id: row.id,
    alamat: h.alamat ?? null,
    cover_image_url: h.cover_image_url ?? null,
    deskripsi: h.deskripsi ?? null,
    fasilitas: fasilitasArr.length > 0 ? fasilitasArr : null,
    pengelola_kontak_person: k.contact_person ?? null,
    pengelola_email: k.email ?? null,
    pengelola_whatsapp: k.phone_e164 ?? k.phone ?? null,
    social_website: k.website ?? null,
    social_facebook: k.facebook ?? null,
    social_twitter: k.twitter ?? null,
    social_instagram: k.instagram ?? null,
    produk_list: produkRows && produkRows.length > 0 ? produkRows : null,
    foto_galeri: fotoRows && fotoRows.length > 0 ? fotoRows : null,
    awards: awardRows && awardRows.length > 0 ? awardRows : null,
    events: eventRows && eventRows.length > 0 ? eventRows : null,
    synced_from_hub_at: new Date().toISOString(),
    source: "hub_sync",
  };
  // upsert: try update first, fallback insert
  const { error: updErr } = await supabase
    .from("desa_profile_data")
    .update(profileRow)
    .eq("desa_id", row.id);
  if (updErr) {
    await supabase.from("desa_profile_data").insert(profileRow);
  } else {
    // check if row existed; if not, insert
    const { data: check } = await supabase
      .from("desa_profile_data")
      .select("desa_id")
      .eq("desa_id", row.id)
      .maybeSingle();
    if (!check) {
      await supabase.from("desa_profile_data").insert(profileRow);
    }
  }

  revalidatePath("/desa/profil");
  revalidatePath(`/atourin/desa/${row.id}`);

  return {
    ok: true,
    summary: {
      desa_name: h.nama,
      kategori: h.kategori,
      classification_updated: !!newClassification,
      fasilitas_count: fasilitasArr.length,
      kontak_synced: !!(k.email || k.phone || k.contact_person),
      produk_count: produkRows?.length ?? 0,
      foto_count: fotoRows?.length ?? 0,
      award_count: awardRows?.length ?? 0,
      event_count: eventRows?.length ?? 0,
    },
  };
}
