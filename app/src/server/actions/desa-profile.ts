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
