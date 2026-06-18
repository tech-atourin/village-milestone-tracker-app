export const metadata = { title: "Rapor Desa" };

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Users, TrendingUp, FileText } from "lucide-react";
import { getCurrentUser, requireRole } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import { listProjectRaporDesa } from "@/server/queries/rapor-desa";
import { EmptyState } from "@/components/ui/empty-state";

async function isAssigned(projectId: string, userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("project_memberships")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("role", "narasumber")
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}

export default async function NarasumberRaporDesaIndexPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("narasumber");
  const user = await getCurrentUser();
  if (!user) notFound();
  if (!(await isAssigned(params.id, user.id))) notFound();

  const rows = await listProjectRaporDesa(params.id);

  return (
    <div className="space-y-6">
      <Link
        href={`/narasumber/projects`}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Project Saya
      </Link>

      <header className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Rapor per Desa
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Akumulasi hasil seluruh peserta yang mewakili desa di project ini.
        </p>
        <div className="flex gap-4 pt-2 text-xs">
          <Link
            href={`/narasumber/projects/${params.id}/rapor`}
            className="font-bold text-atr-fg-muted hover:text-atr-purple"
          >
            ← Rapor per Peserta
          </Link>
        </div>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Belum ada desa di project ini"
          description="Tambahkan desa di tab Desa terlebih dahulu."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Link
              key={r.project_desa_id}
              href={`/narasumber/projects/${params.id}/rapor-desa/${r.desa_id}`}
              className="flex items-start gap-4 rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1 transition hover:border-atr-purple/40 hover:bg-atr-purple-50/30"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-atr-purple-50 text-atr-purple">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-atr-fg">
                  {r.desa_name}
                </div>
                <div className="text-xs text-atr-fg-muted">
                  {[r.kabupaten, r.provinsi].filter(Boolean).join(", ") || "-"}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <Stat
                    icon={Users}
                    label="Peserta"
                    value={`${r.peserta_with_rapor}/${r.peserta_count}`}
                    hint="dengan rapor"
                  />
                  <Stat
                    label="Avg Improvement"
                    value={
                      r.avg_improvement != null
                        ? `${r.avg_improvement > 0 ? "+" : ""}${r.avg_improvement}%`
                        : "-"
                    }
                    icon={TrendingUp}
                  />
                  <Stat
                    label="Avg Pre → Post"
                    value={
                      r.avg_pre != null && r.avg_post != null
                        ? `${r.avg_pre} → ${r.avg_post}`
                        : "-"
                    }
                  />
                  <Stat
                    label="Checklist"
                    value={`${Math.round(r.checklist_completion_pct)}%`}
                  />
                </div>
              </div>
              <FileText className="mt-1 h-4 w-4 shrink-0 text-atr-fg-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const tone = value.startsWith("+")
    ? "text-atr-arti"
    : value.startsWith("-")
      ? "text-atr-red"
      : "text-atr-fg";
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className={`mt-0.5 text-sm font-bold ${tone}`}>{value}</div>
      {hint && <div className="text-[10px] text-atr-fg-muted">{hint}</div>}
    </div>
  );
}
