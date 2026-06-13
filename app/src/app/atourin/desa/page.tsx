export const metadata = { title: "Daftar Desa" };

import { MapPin } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { listAllDesa } from "@/server/queries/desa-master";
import { EmptyState } from "@/components/ui/empty-state";
import { DesaTable } from "./desa-table";

export default async function AtourinDesaListPage() {
  await requireRole("superadmin");
  const rows = await listAllDesa();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Daftar Desa
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Semua desa wisata master di Atourin Milestone Tracker. Filter,
          search, dan klik untuk lihat detail baseline + assessment.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Belum ada desa di sistem"
          description="Tambahkan desa via project atau import dari Hub."
        />
      ) : (
        <DesaTable rows={rows} scope="atourin" />
      )}
    </div>
  );
}
