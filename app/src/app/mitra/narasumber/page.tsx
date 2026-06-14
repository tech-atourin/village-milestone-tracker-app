export const metadata = { title: "Narasumber" };

import { requireRole } from "@/lib/auth/rbac";
import { listNarasumbersWithStats } from "@/server/queries/narasumber";
import { listNarasumberTaxonomies } from "@/server/actions/narasumber";
import { NarasumberDirectory } from "@/app/atourin/narasumber/narasumber-directory";

export default async function MitraNarasumberPage() {
  await requireRole("mitra_admin");
  const [rows, taxonomies] = await Promise.all([
    listNarasumbersWithStats(),
    listNarasumberTaxonomies(),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Narasumber
        </h1>
        <p className="text-sm text-atr-fg-muted">
          {rows.length === 0
            ? "Belum ada narasumber. Tambahkan mentor / pakar yang bisa di-assign ke project Anda."
            : `${rows.length} narasumber terdaftar. Klik kartu untuk lihat riwayat program.`}
        </p>
      </header>
      <NarasumberDirectory
        rows={rows}
        kategoriOptions={taxonomies.kategori}
        kompetensiOptions={taxonomies.kompetensi}
        canManage
        detailHrefBase="/atourin/narasumber"
      />
    </div>
  );
}
