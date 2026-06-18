export const metadata = { title: "Dashboard Publik" };

import { notFound } from "next/navigation";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/server";

export const revalidate = 300; // 5 min ISR

type SummaryResponse = {
  project: {
    name: string;
    description: string | null;
    period_start: string | null;
    period_end: string | null;
    status: string;
  };
  organization: { name: string; logo_url: string | null } | null;
  desa: Array<{
    id: string;
    name: string;
    kabupaten: string | null;
    provinsi: string | null;
    classification: string;
    avg_completion: number;
  }>;
  topik: Array<{ name: string; avg_completion: number }>;
};

async function fetchSummary(slug: string): Promise<SummaryResponse | null> {
  const supabase = createAdminClient();

  // 1) project + org by slug (only if public_dashboard_enabled)
  const { data: projectRow } = await supabase
    .from("projects")
    .select(
      "id, name, description, period_start, period_end, status, organization:organizations(name, logo_url)",
    )
    .eq("public_dashboard_slug", slug)
    .eq("public_dashboard_enabled", true)
    .maybeSingle();
  if (!projectRow) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = projectRow as any;
  const projectId = project.id as string;

  // 2) project_desa with desa info
  const { data: pdRows } = await supabase
    .from("project_desa")
    .select(
      "id, desa:desa(id, name, kabupaten, provinsi, current_classification)",
    )
    .eq("project_id", projectId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdList = (pdRows ?? []) as any[];
  const projectDesaIds = pdList.map((r) => r.id as string);

  // 3) avg completion per project_desa from desa_topik_instance
  const completionByPd = new Map<string, number>();
  if (projectDesaIds.length) {
    const { data: instRows } = await supabase
      .from("desa_topik_instance")
      .select("project_desa_id, completion_percent")
      .in("project_desa_id", projectDesaIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inst = (instRows ?? []) as any[];
    const acc = new Map<string, { sum: number; count: number }>();
    for (const r of inst) {
      const pid = r.project_desa_id as string;
      const cur = acc.get(pid) ?? { sum: 0, count: 0 };
      cur.sum += Number(r.completion_percent) || 0;
      cur.count += 1;
      acc.set(pid, cur);
    }
    acc.forEach((v, pid) =>
      completionByPd.set(pid, v.count ? v.sum / v.count : 0),
    );
  }

  // 4) topik names + per-topik avg
  const { data: ptRows } = await supabase
    .from("project_topik")
    .select("id, name")
    .eq("project_id", projectId)
    .order("display_order", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pt = (ptRows ?? []) as any[];
  const topikAcc = new Map<string, { name: string; sum: number; count: number }>();
  for (const t of pt)
    topikAcc.set(t.id as string, { name: t.name as string, sum: 0, count: 0 });

  if (projectDesaIds.length && pt.length) {
    const { data: byTopik } = await supabase
      .from("desa_topik_instance")
      .select("project_topik_id, completion_percent")
      .in("project_desa_id", projectDesaIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (byTopik ?? []) as any[]) {
      const cur = topikAcc.get(r.project_topik_id as string);
      if (!cur) continue;
      cur.sum += Number(r.completion_percent) || 0;
      cur.count += 1;
    }
  }

  return {
    project: {
      name: project.name,
      description: project.description ?? null,
      period_start: project.period_start ?? null,
      period_end: project.period_end ?? null,
      status: project.status,
    },
    organization: project.organization
      ? {
          name: project.organization.name as string,
          logo_url: (project.organization.logo_url as string) ?? null,
        }
      : null,
    desa: pdList.map((r) => ({
      id: r.desa?.id as string,
      name: (r.desa?.name as string) ?? "-",
      kabupaten: (r.desa?.kabupaten as string) ?? null,
      provinsi: (r.desa?.provinsi as string) ?? null,
      classification: (r.desa?.current_classification as string) ?? "unclassified",
      avg_completion: completionByPd.get(r.id as string) ?? 0,
    })),
    topik: Array.from(topikAcc.values()).map((v) => ({
      name: v.name,
      avg_completion: v.count ? v.sum / v.count : 0,
    })),
  };
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function PublicDashboardPage({
  params,
}: {
  params: { slug: string };
}) {
  const summary = await fetchSummary(params.slug);
  if (!summary) notFound();

  return (
    <main className="min-h-screen bg-atr-bg-soft">
      {/* Header strip - purple gradient like login */}
      <header className="bg-atr-purple-gradient px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-white/70">
                Dashboard project · shareable link
              </div>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                {summary.project.name}
              </h1>
              {summary.project.description && (
                <p className="mt-2 max-w-2xl text-sm text-white/85">
                  {summary.project.description}
                </p>
              )}
              <div className="mt-3 text-xs text-white/70">
                {formatDate(summary.project.period_start)} –{" "}
                {formatDate(summary.project.period_end)}
              </div>
            </div>
            {summary.organization?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={summary.organization.logo_url}
                alt={summary.organization.name}
                className="h-12 w-auto rounded-lg bg-white p-2"
              />
            ) : (
              <Image
                src="/logo/vmt/vmt-app-icon.svg"
                alt="VMT"
                width={48}
                height={48}
                className="rounded-lg shadow-atr-1"
              />
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        {/* Topik breakdown */}
        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
            Progress per topik
          </h2>
          <div className="space-y-3">
            {summary.topik.map((t) => (
              <div key={t.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-atr-fg">{t.name}</span>
                  <span className="text-atr-fg-muted">
                    {Math.round(t.avg_completion)}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-atr-bg-soft">
                  <div
                    className="h-full bg-atr-purple"
                    style={{ width: `${Math.round(t.avg_completion)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Desa leaderboard */}
        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
            Desa peserta ({summary.desa.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  <th className="py-2">Desa</th>
                  <th className="py-2">Lokasi</th>
                  <th className="py-2 text-right">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atr-outline text-sm">
                {summary.desa.map((d) => (
                  <tr key={d.id}>
                    <td className="py-3 font-bold text-atr-fg">{d.name}</td>
                    <td className="py-3 text-atr-fg-muted">
                      {[d.kabupaten, d.provinsi].filter(Boolean).join(" · ") ||
                        "-"}
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-atr-bg-soft">
                          <div
                            className="h-full bg-atr-purple"
                            style={{
                              width: `${Math.round(d.avg_completion)}%`,
                            }}
                          />
                        </div>
                        <span className="w-10 text-right font-bold text-atr-fg">
                          {Math.round(d.avg_completion)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-atr-outline pt-6 text-xs text-atr-fg-muted">
          <div>
            Dipersembahkan oleh {summary.organization?.name ?? "-"}, didukung
            tim Atourin.
          </div>
          <div className="flex items-center gap-2">
            <Image
              src="/logo/vmt/vmt-mark.svg"
              alt="VMT"
              width={24}
              height={24}
            />
            <span className="font-bold">Village Milestone Tracker</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
