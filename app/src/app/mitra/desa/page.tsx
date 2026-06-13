export const metadata = { title: "Daftar Desa" };

import { MapPin } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { listAllDesa } from "@/server/queries/desa-master";
import { EmptyState } from "@/components/ui/empty-state";
import { DesaTable } from "@/app/atourin/desa/desa-table";

async function getMitraProjectIds(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select("id")
    .is("deleted_at", null);
  return (data ?? []).map((r) => (r as { id: string }).id);
}

export default async function MitraDesaListPage() {
  await requireRole("mitra_admin");
  const projectIds = await getMitraProjectIds();
  const rows = await listAllDesa({ scopeProjectIds: projectIds });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Daftar Desa
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Desa wisata yang ada di project Anda. Filter, search, dan klik
          untuk detail.
        </p>
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
