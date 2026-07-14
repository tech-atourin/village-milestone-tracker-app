import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

// Create a hub-schema client (separate from vmt client)
function hubClient() {
  const env = serverEnv();
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { db: { schema: "hub" }, auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export type HubDesaSearchResult = {
  id: string;
  nama: string;
  slug: string;
  kategori: "Rintisan" | "Berkembang" | "Maju" | "Mandiri" | null;
  desa_kel: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  provinsi: string | null;
  jumlah_kunjungan: number | null;
  cover_image_url: string | null;
  source_id: number | null;
};

export async function searchHubDesa(q: string): Promise<HubDesaSearchResult[]> {
  if (!q || q.trim().length < 2) return [];
  const safe = q.replace(/[,()%*]/g, "").slice(0, 100);
  if (safe.length < 2) return [];
  const supabase = hubClient();
  const { data, error } = await supabase
    .from("desa")
    .select(
      "id, nama, slug, kategori, desa_kel, kecamatan, kabupaten, provinsi, jumlah_kunjungan, cover_image_url, source_id",
    )
    .or(`nama.ilike.%${safe}%,kabupaten.ilike.%${safe}%,provinsi.ilike.%${safe}%`)
    .order("jumlah_kunjungan", { ascending: false, nullsFirst: false })
    .limit(20);
  if (error) {
    console.error("[searchHubDesa] hub query failed:", error.message);
  }
  return (data ?? []) as unknown as HubDesaSearchResult[];
}

export type HubDesaFullProfile = {
  desa: {
    id: string;
    nama: string;
    slug: string;
    kategori: string | null;
    alamat: string | null;
    desa_kel: string | null;
    kecamatan: string | null;
    kabupaten: string | null;
    provinsi: string | null;
    deskripsi: string | null;
    cover_image_url: string | null;
    jumlah_kunjungan: number | null;
    jumlah_umkm: number | null;
    tenaga_kerja: number | null;
    pendapatan: number | null;
  };
  kontak: {
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    instagram: string | null;
  } | null;
  fasilitas: string[];
  riwayat_adwi: Array<{ tahun: number; peringkat: string | null }>;
  awards: Array<{
    kompetisi: string;
    tahun: number;
    edisi: string | null;
    kategori: string | null;
    peringkat: string | null;
  }>;
};

export async function getHubDesaProfile(
  hubDesaId: string,
): Promise<HubDesaFullProfile | null> {
  const supabase = hubClient();
  const { data: desa } = await supabase
    .from("desa")
    .select(
      "id, nama, slug, kategori, alamat, desa_kel, kecamatan, kabupaten, provinsi, deskripsi, cover_image_url, jumlah_kunjungan, jumlah_umkm, tenaga_kerja, pendapatan",
    )
    .eq("id", hubDesaId)
    .maybeSingle();
  if (!desa) return null;

  const { data: kontak } = await supabase
    .from("kontak")
    .select("contact_person, phone, email, website, instagram")
    .eq("desa_id", hubDesaId)
    .maybeSingle();

  const { data: fasRows } = await supabase
    .from("desa_fasilitas")
    .select("fasilitas:fasilitas(nama)")
    .eq("desa_id", hubDesaId);

  const { data: adwiRows } = await supabase
    .from("riwayat_adwi")
    .select("tahun, peringkat")
    .eq("desa_id", hubDesaId)
    .order("tahun", { ascending: false });

  const { data: awardRows } = await supabase
    .from("award")
    .select("competition_kode, tahun, edisi, kategori, peringkat")
    .eq("desa_id", hubDesaId)
    .order("tahun", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fasilitas = ((fasRows ?? []) as any[])
    .map((r) => r.fasilitas?.nama)
    .filter(Boolean) as string[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const awards = ((awardRows ?? []) as any[]).map((a) => ({
    kompetisi: a.competition_kode,
    tahun: a.tahun,
    edisi: a.edisi,
    kategori: a.kategori,
    peringkat: a.peringkat,
  }));

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    desa: desa as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kontak: kontak as any,
    fasilitas,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    riwayat_adwi: (adwiRows ?? []) as any,
    awards,
  };
}
