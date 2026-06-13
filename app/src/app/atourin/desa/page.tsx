export const metadata = { title: "Daftar Desa" };

import Link from "next/link";
import { MapPin, ClipboardCheck, FileText, ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { listAllDesa } from "@/server/queries/desa-master";
import { EmptyState } from "@/components/ui/empty-state";

const TIER_BADGE: Record<string, string> = {
  rintisan: "bg-atr-yellow/20 text-atr-fg",
  berkembang: "bg-atr-arti/15 text-atr-arti",
  maju: "bg-atr-purple-50 text-atr-purple-600",
  mandiri: "bg-atr-purple-light/60 text-atr-purple-800",
  unclassified: "bg-atr-bg-soft text-atr-fg-muted",
};
const TIER_LABEL: Record<string, string> = {
  rintisan: "Rintisan",
  berkembang: "Berkembang",
  maju: "Maju",
  mandiri: "Mandiri",
  unclassified: "Belum",
};

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
          Semua desa wisata master di Atourin Milestone Tracker. Klik untuk
          lihat detail baseline + assessment.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Belum ada desa di sistem"
          description="Tambahkan desa via project atau import dari Hub."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1">
          <table className="w-full text-sm">
            <thead className="bg-atr-bg-soft text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              <tr>
                <th className="px-4 py-3">Desa</th>
                <th className="px-4 py-3">Lokasi</th>
                <th className="px-4 py-3">Klasifikasi</th>
                <th className="px-4 py-3 text-center">Baseline</th>
                <th className="px-4 py-3 text-center">Self-Assessment</th>
                <th className="px-4 py-3 text-center">Project</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-atr-outline">
              {rows.map((r) => {
                const tier = r.current_classification ?? "unclassified";
                return (
                  <tr key={r.id} className="hover:bg-atr-bg-soft">
                    <td className="px-4 py-3">
                      <Link
                        href={`/atourin/desa/${r.id}`}
                        className="font-bold text-atr-purple-600 hover:text-atr-purple"
                      >
                        {r.name}
                      </Link>
                      {r.hub_desa_id && (
                        <div className="text-[10px] text-atr-fg-muted">
                          ✨ Linked ke Hub
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-atr-fg-muted">
                      {[r.kabupaten, r.provinsi].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${TIER_BADGE[tier]}`}
                      >
                        {TIER_LABEL[tier]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.has_baseline ? (
                        <ClipboardCheck className="mx-auto h-4 w-4 text-atr-arti" />
                      ) : (
                        <span className="text-[10px] italic text-atr-fg-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.has_hub_assessment ? (
                        <FileText className="mx-auto h-4 w-4 text-atr-arti" />
                      ) : (
                        <span className="text-[10px] italic text-atr-fg-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-atr-fg-muted">
                      {r.project_count}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/atourin/desa/${r.id}`}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-atr-outline bg-white px-2 text-[11px] font-bold text-atr-fg hover:bg-atr-bg-soft"
                      >
                        Detail
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
