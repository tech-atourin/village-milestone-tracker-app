export const metadata = { title: "Riwayat Program" };

import Link from "next/link";
import {
  ChevronRight,
  History,
  MapPin,
  Users,
  TrendingUp,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { getRepresentingDesa } from "@/server/queries/self-assessment";
import { listDesaProgramHistory } from "@/server/queries/rapor-desa";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-atr-bg-soft text-atr-fg-muted",
  active: "bg-atr-arti/15 text-atr-arti",
  completed: "bg-atr-purple-light/50 text-atr-purple-600",
  archived: "bg-atr-bg-soft text-atr-fg-muted",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  active: "Sedang Berjalan",
  completed: "Selesai",
  archived: "Arsip",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function DesaRiwayatPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const desa = await getRepresentingDesa(user.id);

  if (!desa) {
    return (
      <EmptyState
        icon={MapPin}
        title="Belum terhubung ke desa"
        description="Akun Anda belum dipasangkan dengan desa wisata. Hubungi admin Atourin."
      />
    );
  }

  const rows = await listDesaProgramHistory(desa.desa_id);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Riwayat Program
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Program pendampingan yang diikuti{" "}
          <strong className="text-atr-fg">{desa.name}</strong>. Klik untuk
          melihat rapor desa per program.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={History}
          title="Belum ada program"
          description="Desa Anda belum mengikuti program pendampingan apapun."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.project_id}
              className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1"
            >
              <Link
                href={`/desa/riwayat/${r.project_id}`}
                className="block transition hover:bg-atr-bg-soft"
              >
                <div className="flex items-start gap-3 p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-atr-purple-50 text-atr-purple">
                    <History className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-atr-fg">
                        {r.project_name}
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          STATUS_STYLES[r.status] ??
                          "bg-atr-bg-soft text-atr-fg-muted"
                        }`}
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-atr-fg-muted">
                      Mitra: {r.organization_name ?? "—"} ·{" "}
                      {formatDate(r.period_start)} —{" "}
                      {formatDate(r.period_end)}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                      <Stat
                        icon={Users}
                        label="Perwakilan"
                        value={`${r.peserta_count}`}
                      />
                      <Stat
                        icon={TrendingUp}
                        label="Avg Improvement"
                        value={
                          r.avg_improvement != null
                            ? `${r.avg_improvement > 0 ? "+" : ""}${r.avg_improvement}%`
                            : "—"
                        }
                      />
                      <Stat
                        label="Progress Checklist"
                        value={`${Math.round(r.checklist_completion_pct)}%`}
                      />
                    </div>
                  </div>
                  <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-atr-fg-muted" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className="mt-0.5 text-sm font-bold text-atr-fg">{value}</div>
    </div>
  );
}
