export const metadata = { title: "Daftar Desa" };

import { MapPin } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { listAllDesa } from "@/server/queries/desa-master";
import { mitraProjectIds } from "@/server/queries/mitra-scope";
import { EmptyState } from "@/components/ui/empty-state";
import { DesaTable } from "@/app/atourin/desa/desa-table";
import { AddDesaButton } from "@/app/atourin/desa/add-desa-button";

export default async function MitraDesaListPage() {
  const user = await requireRole("mitra_admin");
  const projectIds = await mitraProjectIds(user.organization_id);
  const rows =
    projectIds.length > 0
      ? await listAllDesa({ scopeProjectIds: projectIds })
      : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            Daftar Desa
          </h1>
          <p className="text-sm text-atr-fg-muted">
            Master desa wisata. Tambah baru atau import dari Atourin Hub di
            sini, lalu lampirkan ke project di tab Desa.
          </p>
        </div>
        <AddDesaButton />
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Belum ada desa di project Anda"
          description="Desa akan muncul setelah ditambahkan ke project oleh tim Atourin."
        />
      ) : (
        <DesaTable rows={rows} scope="mitra" />
      )}
    </div>
  );
}
