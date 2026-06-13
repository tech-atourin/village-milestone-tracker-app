"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

// =====================================================
// Profil Desa
// =====================================================
const profileSchema = z.object({
  desa_id: z.string().uuid(),
  alamat: z.string().max(500).optional().nullable(),
  deskripsi: z.string().max(3000).optional().nullable(),
  keunikan: z.string().max(2000).optional().nullable(),
  rekomendasi_kunjungan: z.string().max(2000).optional().nullable(),
  nomor_sk_kepala_daerah: z.string().max(200).optional().nullable(),
  fasilitas: z.array(z.string()).optional().nullable(),
  pengelola_nama: z.string().max(200).optional().nullable(),
  pengelola_kontak_person: z.string().max(200).optional().nullable(),
  pengelola_email: z.string().email().optional().nullable().or(z.literal("")),
  pengelola_whatsapp: z.string().max(50).optional().nullable(),
  social_website: z.string().max(200).optional().nullable(),
  social_facebook: z.string().max(200).optional().nullable(),
  social_twitter: z.string().max(200).optional().nullable(),
  social_instagram: z.string().max(200).optional().nullable(),
  social_youtube: z.string().max(200).optional().nullable(),
  cover_image_url: z.string().max(500).optional().nullable(),
});

export async function saveDesaProfile(input: z.input<typeof profileSchema>) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const supabase = createClient();
  const { desa_id, ...rest } = parsed.data;
  const payload = {
    desa_id,
    ...rest,
    pengelola_email: rest.pengelola_email || null,
    source: "manual",
  };

  const { data: existing } = await supabase
    .from("desa_profile_data")
    .select("desa_id")
    .eq("desa_id", desa_id)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("desa_profile_data")
      .update(payload)
      .eq("desa_id", desa_id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("desa_profile_data").insert(payload);
    if (error) return { error: error.message };
  }
  revalidatePath("/desa/profil");
  revalidatePath(`/atourin/desa/${desa_id}`);
  return { ok: true };
}

// =====================================================
// Profil Pengelola (Jadesta-style long form)
// =====================================================
const pengelolaSchema = z.object({
  desa_id: z.string().uuid(),
  bentuk_kelembagaan: z.string().max(200).optional().nullable(),
  landasan_pembentukan: z.string().max(2000).optional().nullable(),
  nomor_sk: z.string().max(200).optional().nullable(),
  tanggal_sk: z.string().optional().nullable(),
  total_pengurus: z.number().int().min(0).max(1000).optional().nullable(),
  total_pengurus_p: z.number().int().min(0).max(1000).optional().nullable(),
  rating_kemandirian: z.number().int().min(1).max(5).optional().nullable(),
  rating_keberlanjutan: z.number().int().min(1).max(5).optional().nullable(),
  rating_inovasi: z.number().int().min(1).max(5).optional().nullable(),
  jaringan_kerjasama: z.array(z.string()).optional().nullable(),
  catatan: z.string().max(3000).optional().nullable(),
});

// =====================================================
// Cover image upload — returns public URL after storing
// =====================================================
const coverSchema = z.object({
  desa_id: z.string().uuid(),
  filename: z.string().min(1).max(200),
  mime_type: z.string().min(1).max(100),
  base64: z.string().min(1),
});

export async function uploadDesaCover(input: z.input<typeof coverSchema>) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = coverSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  if (!parsed.data.mime_type.startsWith("image/")) {
    return { error: "Hanya file gambar yang diterima" };
  }
  const bytes = Buffer.from(parsed.data.base64, "base64");
  if (bytes.byteLength > 10 * 1024 * 1024) {
    return { error: "File terlalu besar (maks 10 MB)" };
  }
  const safe = parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `desa-cover/${parsed.data.desa_id}/${Date.now()}-${safe}`;
  const supabase = createClient();
  const { error: upErr } = await supabase.storage
    .from("vmt-org-assets")
    .upload(path, bytes, {
      contentType: parsed.data.mime_type,
      upsert: true,
    });
  if (upErr) return { error: upErr.message };
  const { data: pub } = supabase.storage
    .from("vmt-org-assets")
    .getPublicUrl(path);
  const url = pub?.publicUrl ?? null;
  if (!url) return { error: "Gagal generate URL" };

  // Update desa_profile_data.cover_image_url
  const { data: existing } = await supabase
    .from("desa_profile_data")
    .select("desa_id")
    .eq("desa_id", parsed.data.desa_id)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("desa_profile_data")
      .update({ cover_image_url: url, source: "manual" })
      .eq("desa_id", parsed.data.desa_id);
  } else {
    await supabase.from("desa_profile_data").insert({
      desa_id: parsed.data.desa_id,
      cover_image_url: url,
      source: "manual",
    });
  }
  revalidatePath("/desa/profil");
  revalidatePath(`/atourin/desa/${parsed.data.desa_id}`);
  return { ok: true, url };
}

export async function savePengelolaData(
  input: z.input<typeof pengelolaSchema>,
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = pengelolaSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const supabase = createClient();
  const { desa_id, ...rest } = parsed.data;
  const payload = { desa_id, ...rest };

  const { data: existing } = await supabase
    .from("desa_pengelola_data")
    .select("desa_id")
    .eq("desa_id", desa_id)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("desa_pengelola_data")
      .update(payload)
      .eq("desa_id", desa_id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("desa_pengelola_data")
      .insert(payload);
    if (error) return { error: error.message };
  }
  revalidatePath("/desa/pengelola");
  revalidatePath(`/atourin/desa/${desa_id}`);
  return { ok: true };
}
