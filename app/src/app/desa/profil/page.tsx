export const metadata = { title: "Profil Desa | VMT by Atourin" };

import Link from "next/link";
import { Pencil } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import { getDesaDetail } from "@/server/queries/desa-master";
import { getDesaTierJourney } from "@/server/queries/tier-journey";
import { DesaDetailSections } from "@/components/desa/desa-detail-sections";
import { HubSyncButton } from "@/components/desa/hub-sync-button";
import { EmptyState } from "@/components/ui/empty-state";
import { MapPin } from "lucide-react";

export default async function DesaProfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.global_role !== "desa_wisata") redirect("/");

  const admin = createAdminClient();
  const { data: userRow } = await admin
    .from("users")
    .select("representing_desa_id")
    .eq("id", user.id)
    .maybeSingle();
  const desaId = (userRow as { representing_desa_id: string | null } | null)
    ?.representing_desa_id;

  if (!desaId) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            Profil Desa
          </h1>
          <p className="text-sm text-atr-fg-muted">
            Akun Anda belum terhubung ke desa manapun.
          </p>
        </header>
        <EmptyState
          icon={MapPin}
          title="Belum ada desa terkait akun ini"
          description="Hubungi admin Atourin untuk dihubungkan ke desa wisata yang Anda wakili."
        />
      </div>
    );
  }

  const [data, journey] = await Promise.all([
    getDesaDetail(desaId),
    getDesaTierJourney(desaId),
  ]);

  if (!data) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            Profil Desa
          </h1>
        </header>
        <EmptyState
          icon={MapPin}
          title="Data desa tidak ditemukan"
          description="Hubungi admin Atourin."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            Profil Desa
          </h1>
          <p className="text-sm text-atr-fg-muted">
            Profil lengkap desa wisata Anda - sama persis dengan tampilan
            superadmin & mitra. Sebagian besar field bisa diisi lewat baseline
            (kolaborasi dengan peserta) atau di-sync otomatis dari Hub.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <HubSyncButton desaId={desaId} hasHubLink={!!data.base.hub_desa_id} />
          <Link
            href="/desa/profil/edit"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-atr-purple/40 bg-atr-purple-50 px-4 text-sm font-bold text-atr-purple-600 transition hover:bg-atr-purple-light/40"
          >
            <Pencil className="h-4 w-4" />
            Edit Profil
          </Link>
        </div>
      </header>

      <DesaDetailSections data={data} viewerRole="desa" journey={journey} />
    </div>
  );
}
