export const metadata = { title: "Rapor Project" };

import Link from "next/link";
import { ArrowLeft, GraduationCap, FileText } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { listProjectRapor } from "@/server/queries/rapor";
import { RaporEntryTable } from "./rapor-entry-table";

export default async function RaporIndexPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("superadmin");
  const rows = await listProjectRapor(params.id);

  return (
    <div className="space-y-6">
      <Link
        href={`/atourin/projects/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke project
      </Link>

      <header className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          RAPOR per Peserta
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Input manual hasil pre-test, post-test, attendance, dan survey
          kepuasan per peserta. Untuk hasil akumulasi tingkat desa, lihat
          tab RAPOR per Desa.
        </p>
        <div className="flex gap-4 pt-2 text-xs">
          <Link
            href={`/atourin/projects/${params.id}/rapor-desa`}
            className="font-bold text-atr-purple-600 hover:text-atr-purple"
          >
            RAPOR per Desa →
          </Link>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <GraduationCap className="mx-auto mb-3 h-6 w-6 text-atr-fg-muted" />
          <p className="text-sm font-bold text-atr-fg">
            Belum ada peserta di project ini
          </p>
          <p className="mt-1 text-sm text-atr-fg-muted">
            Tambah peserta di tab Peserta dulu.
          </p>
        </div>
      ) : (
        <RaporEntryTable projectId={params.id} rows={rows} />
      )}

      <div className="rounded-2xl border border-atr-outline bg-atr-bg-soft p-4">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-atr-purple" />
          <p className="text-xs text-atr-fg-muted">
            Setelah RAPOR diisi, klik &quot;Lihat&quot; di kolom Aksi untuk
            preview halaman RAPOR yang siap di-print sebagai PDF.
          </p>
        </div>
      </div>
    </div>
  );
}
