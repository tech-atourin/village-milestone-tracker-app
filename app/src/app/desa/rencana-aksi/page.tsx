export const metadata = { title: "Rencana Aksi" };

import { getCurrentUser } from "@/lib/auth/rbac";
import { getRepresentingDesa } from "@/server/queries/self-assessment";
import { listActionPlans } from "@/server/queries/action-plans";
import { ActionPlanBoard } from "@/components/action-plans/action-plan-board";
import { EmptyState } from "@/components/ui/empty-state";
import { MapPin } from "lucide-react";

export default async function DesaRencanaAksiPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const desa = await getRepresentingDesa(user.id);
  if (!desa) {
    return (
      <EmptyState
        icon={MapPin}
        title="Akun belum terhubung ke desa"
        description="Hubungi admin Atourin untuk mengaitkan akun Anda ke desa wisata."
      />
    );
  }
  const rows = await listActionPlans({ desaId: desa.desa_id });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Rencana Aksi
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Daftar rencana aksi yang akan dijalankan {desa.name} di
          program-program pendampingan.
        </p>
      </header>
      <ActionPlanBoard rows={rows} desaOptions={[]} canEdit={false} />
    </div>
  );
}
