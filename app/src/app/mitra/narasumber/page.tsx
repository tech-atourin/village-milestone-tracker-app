export const metadata = { title: "Narasumber" };

import Link from "next/link";
import { Upload } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { listNarasumbersWithStats } from "@/server/queries/narasumber";
import { listNarasumberTaxonomies } from "@/server/actions/narasumber";
import { NarasumberDirectory } from "@/app/atourin/narasumber/narasumber-directory";
import { AddNarasumberButton } from "@/app/atourin/narasumber/add-narasumber-button";

export default async function MitraNarasumberPage() {
  await requireRole("mitra_admin");
  const [rows, taxonomies] = await Promise.all([
    listNarasumbersWithStats(),
    listNarasumberTaxonomies(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            Narasumber
          </h1>
          <p className="text-sm text-atr-fg-muted">
            {rows.length === 0
              ? "Belum ada narasumber. Tambahkan mentor / pakar yang bisa di-assign ke project Anda."
              : `${rows.length} narasumber terdaftar. Klik kartu untuk lihat riwayat program.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddNarasumberButton
            kategoriOptions={taxonomies.kategori}
            kompetensiOptions={taxonomies.kompetensi}
          />
          <Link
            href="/atourin/users/bulk-import?mode=narasumber"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-atr-outline bg-white px-4 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
          >
            <Upload className="h-4 w-4" />
            Bulk Import
          </Link>
        </div>
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
