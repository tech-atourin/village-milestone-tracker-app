export const metadata = { title: "Dashboard Mitra" };

import Link from "next/link";
import {
  Folder,
  MapPin,
  Users,
  TrendingUp,
  Award,
  ChevronRight,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";

async function loadDashboard(userId: string) {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("organization_id, organization:organizations(name, logo_url)")
    .eq("id", userId)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = profile as any;
  const orgId = p?.organization_id as string | undefined;
  if (!orgId) return { orgName: null, orgLogo: null, projects: [], topDesa: [] };

  // Projects for this org
  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, name, status, period_start, period_end",
    )
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // For each project, compute aggregate progress
  const projectsWithProgress: Array<{
    id: string;
    name: string;
    status: string;
    period_end: string | null;
    avg_progress: number;
    desa_count: number;
  }> = [];
  for (const p of (projects ?? []) as Array<{
    id: string;
    name: string;
    status: string;
    period_end: string | null;
  }>) {
    const { data: instances } = await supabase
      .from("desa_topik_instance")
      .select(
        "completion_percent, project_desa!inner(project_id)",
      )
      .eq("project_desa.project_id", p.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr = (instances ?? []) as any[];
    const avg =
      arr.length > 0
        ? arr.reduce((a, i) => a + Number(i.completion_percent), 0) / arr.length
        : 0;
    const { count: desaCount } = await supabase
      .from("project_desa")
      .select("id", { count: "exact", head: true })
      .eq("project_id", p.id);
    projectsWithProgress.push({
      id: p.id,
      name: p.name,
      status: p.status,
      period_end: p.period_end,
      avg_progress: avg,
      desa_count: desaCount ?? 0,
    });
  }

  // Top desa across all projects (leaderboard)
  const { data: pdRows } = await supabase
    .from("project_desa")
    .select(
      "id, project_id, desa:desa(name), projects:projects!inner(name, organization_id)",
    )
    .eq("projects.organization_id", orgId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pds = (pdRows ?? []) as any[];
  const topDesa: Array<{
    name: string;
    project_name: string;
    avg: number;
  }> = [];
  for (const pd of pds) {
    const { data: insts } = await supabase
      .from("desa_topik_instance")
      .select("completion_percent")
      .eq("project_desa_id", pd.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr = (insts ?? []) as any[];
    const avg =
      arr.length > 0
        ? arr.reduce((a, i) => a + Number(i.completion_percent), 0) / arr.length
        : 0;
    topDesa.push({
      name: pd.desa?.name ?? "—",
      project_name: pd.projects?.name ?? "—",
      avg,
    });
  }
  topDesa.sort((a, b) => b.avg - a.avg);

  return {
    orgName: p?.organization?.name as string | undefined,
    orgLogo: p?.organization?.logo_url as string | undefined,
    projects: projectsWithProgress,
    topDesa: topDesa.slice(0, 5),
  };
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-atr-bg-soft text-atr-fg-muted",
  active: "bg-atr-arti/15 text-atr-arti",
  completed: "bg-atr-purple-light/50 text-atr-purple-600",
  archived: "bg-atr-bg-soft text-atr-fg-muted",
};

export default async function MitraDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const data = await loadDashboard(user.id);

  const totalProjects = data.projects.length;
  const activeProjects = data.projects.filter((p) => p.status === "active").length;
  const totalDesa = data.projects.reduce((a, p) => a + p.desa_count, 0);
  const avgOverall =
    data.projects.length > 0
      ? data.projects.reduce((a, p) => a + p.avg_progress, 0) /
        data.projects.length
      : 0;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          {data.orgLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.orgLogo}
              alt={data.orgName}
              className="h-10 w-auto rounded-lg bg-white p-1 ring-1 ring-atr-outline"
            />
          )}
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            {data.orgName ?? "Organisasi Anda"}
          </h1>
        </div>
        <p className="text-sm text-atr-fg-muted">
          Selamat datang, {user.full_name}. Ringkasan project pendampingan yang
          dipegang organisasi Anda.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Projects" value={totalProjects} icon={Folder} />
        <Stat label="Active" value={activeProjects} icon={TrendingUp} />
        <Stat label="Desa Terlibat" value={totalDesa} icon={MapPin} />
        <Stat
          label="Avg Progress"
          value={`${Math.round(avgOverall)}%`}
          icon={Award}
        />
      </div>

      <section className="rounded-2xl border border-atr-outline bg-white shadow-atr-1">
        <header className="border-b border-atr-outline px-5 py-4">
          <h2 className="text-sm font-bold text-atr-fg">Project Anda</h2>
        </header>
        {data.projects.length === 0 ? (
          <div className="p-12 text-center">
            <Folder className="mx-auto mb-2 h-6 w-6 text-atr-fg-muted" />
            <p className="text-sm text-atr-fg-muted">
              Belum ada project ditugaskan.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-atr-outline">
            {data.projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/mitra/projects/${p.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition hover:bg-atr-bg-soft"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-atr-fg">
                        {p.name}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[p.status]}`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-atr-fg-muted">
                      {p.desa_count} desa · Berakhir {p.period_end ?? "—"}
                    </div>
                  </div>
                  <div className="hidden flex-1 items-center gap-2 sm:flex">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-atr-bg-soft">
                      <div
                        className="h-full bg-atr-purple"
                        style={{ width: `${Math.round(p.avg_progress)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-bold text-atr-fg">
                      {Math.round(p.avg_progress)}%
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-atr-fg-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.topDesa.length > 0 && (
        <section className="rounded-2xl border border-atr-outline bg-white shadow-atr-1">
          <header className="border-b border-atr-outline px-5 py-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-atr-purple" />
              <h2 className="text-sm font-bold text-atr-fg">
                Top performer desa
              </h2>
            </div>
            <p className="text-xs text-atr-fg-muted">
              Desa terbaik berdasarkan progress checklist.
            </p>
          </header>
          <ol className="divide-y divide-atr-outline">
            {data.topDesa.map((d, i) => (
              <li
                key={i}
                className="flex items-center gap-3 px-5 py-3 text-sm"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${
                    i === 0
                      ? "bg-atr-yellow/30 text-atr-fg"
                      : "bg-atr-bg-soft text-atr-fg-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-atr-fg">{d.name}</div>
                  <div className="text-xs text-atr-fg-muted">
                    {d.project_name}
                  </div>
                </div>
                <span className="text-sm font-bold text-atr-purple-600">
                  {Math.round(d.avg)}%
                </span>
              </li>
            ))}
          </ol>
        </section>
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
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
          {label}
        </span>
        <Icon className="h-4 w-4 text-atr-fg-muted" />
      </div>
      <div className="mt-2 text-3xl font-bold text-atr-fg">{value}</div>
    </div>
  );
}
