export const metadata = { title: "Narasumber" };

import { Users } from "lucide-react";
import { listNarasumbersWithStats } from "@/server/queries/narasumber";
import { NarasumberDirectory } from "./narasumber-directory";
import { EmptyState } from "@/components/ui/empty-state";

export default async function NarasumberPage() {
  const rows = await listNarasumbersWithStats();

  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            Narasumber
          </h1>
          <p className="text-sm text-atr-fg-muted">
            Pool mentor & narasumber yang bisa di-assign ke project.
          </p>
        </header>
        <EmptyState
          icon={Users}
          title="Belum ada narasumber"
          description="Tandai user dengan role narasumber saat bulk import untuk menambahkan mereka di sini."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Narasumber
        </h1>
        <p className="text-sm text-atr-fg-muted">
          {rows.length} narasumber terdaftar. Filter berdasarkan kompetensi
          atau kategori, klik untuk lihat riwayat program.
        </p>
      </header>
      <NarasumberDirectory rows={rows} />
    </div>
  );
}
