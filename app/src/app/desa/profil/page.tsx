export const metadata = { title: "Profil Desa" };

import { getCurrentUser } from "@/lib/auth/rbac";
import { getRepresentingDesa } from "@/server/queries/self-assessment";
import { MapPin } from "lucide-react";

export default async function DesaProfilPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const desa = await getRepresentingDesa(user.id);

  if (!desa) {
    return (
      <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
        <p className="text-sm font-bold text-atr-fg">
          Akun belum terhubung ke desa
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Profil Desa
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Info dasar desa wisata Anda.
        </p>
      </header>

      <article className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-atr-purple-50 text-atr-purple">
            <MapPin className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-atr-fg">{desa.name}</h2>
            <p className="text-sm text-atr-fg-muted">
              {[desa.kabupaten, desa.provinsi].filter(Boolean).join(" · ") ||
                "Lokasi belum diisi"}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              Klasifikasi tercatat
            </dt>
            <dd className="mt-1 font-bold text-atr-fg capitalize">
              {desa.current_classification}
            </dd>
          </div>
        </dl>

        <p className="mt-6 rounded-lg border border-atr-outline bg-atr-bg-soft p-3 text-xs text-atr-fg-muted">
          Edit profil desa (alamat, koordinat, dll) hadir di iterasi berikut.
          Untuk perubahan saat ini, hubungi admin Atourin.
        </p>
      </article>
    </div>
  );
}
