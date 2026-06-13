export const metadata = { title: "Profil Pengelola" };

import { Building2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { getRepresentingDesa } from "@/server/queries/self-assessment";
import { PengelolaForm } from "./form";
import { EmptyState } from "@/components/ui/empty-state";

type PengelolaData = {
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
};

async function loadPengelola(desaId: string): Promise<PengelolaData | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("desa_pengelola_data")
    .select(
      "bentuk_kelembagaan, landasan_pembentukan, nomor_sk, tanggal_sk, total_pengurus, total_pengurus_p, rating_kemandirian, rating_keberlanjutan, rating_inovasi, jaringan_kerjasama, catatan",
    )
    .eq("desa_id", desaId)
    .maybeSingle();
  return data as PengelolaData | null;
}

export default async function DesaPengelolaPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const desa = await getRepresentingDesa(user.id);
  if (!desa) {
    return (
      <EmptyState
        icon={Building2}
        title="Akun belum terhubung ke desa"
        description="Hubungi admin Atourin untuk mengaitkan akun Anda."
      />
    );
  }
  const existing = await loadPengelola(desa.desa_id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Profil Pengelola
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Form panjang struktur kelembagaan pengelola {desa.name}. Data ini
          melengkapi profil dasar untuk keperluan klasifikasi.
        </p>
      </header>
      <PengelolaForm desaId={desa.desa_id} initial={existing} />
    </div>
  );
}
