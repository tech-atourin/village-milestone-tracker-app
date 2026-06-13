export const metadata = { title: "Laporan" };

import Link from "next/link";
import { BarChart3, FileText, Download, ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { listProjects } from "@/server/queries/projects";
import { EmptyState } from "@/components/ui/empty-state";

export default async function MitraLaporanPage() {
  await requireRole("mitra_admin");
  const projects = await listProjects();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Laporan
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Laporan ringkas per project. Setiap project punya dashboard
          publik (jika diaktifkan) dan laporan akhir yang siap di-print.
        </p>
      </header>

      {projects.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Belum ada laporan"
          description="Laporan tersedia ketika project sudah aktif dan ada data progress."
        />
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-atr-fg">
                    {p.name}
                  </div>
                  <div className="mt-0.5 text-xs text-atr-fg-muted">
                    {p.organization?.name ?? "—"}
                    {p.period_start && p.period_end && (
                      <> · {p.period_start} — {p.period_end}</>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/mitra/projects/${p.id}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Buka project
                  </Link>
                  <Link
                    href={`/atourin/projects/${p.id}/report`}
                    target="_blank"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
                  >
                    <FileText className="h-3 w-3" />
                    Laporan Akhir
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-2xl border border-atr-outline bg-atr-bg-soft p-4">
        <div className="flex items-start gap-3">
          <Download className="mt-0.5 h-4 w-4 shrink-0 text-atr-purple" />
          <p className="text-xs text-atr-fg-muted">
            Untuk export data mentah project ke Excel, buka project lalu klik
            tombol Export di pojok kanan atas.
          </p>
        </div>
      </div>
    </div>
  );
}
