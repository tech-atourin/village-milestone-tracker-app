export const metadata = { title: "Dashboard Publik" };

import { notFound } from "next/navigation";
import Image from "next/image";
import {
  Building2,
  MapPin,
  GraduationCap,
  CalendarRange,
  Paperclip,
  Award,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { CountBadge } from "@/components/ui/count-badge";

export const revalidate = 300; // 5 min ISR

type TierKey = "unclassified" | "rintisan" | "berkembang" | "maju" | "mandiri";

type SummaryResponse = {
  project: {
    name: string;
    description: string | null;
    period_start: string | null;
    period_end: string | null;
    status: string;
  };
  organization: { name: string; logo_url: string | null } | null;
  stats: {
    desa_count: number;
    peserta_count: number;
    narasumber_count: number;
    session_count: number;
    evidence_count: number;
    avg_completion: number;
  };
  tier_dist: Record<TierKey, number>;
  desa: Array<{
    id: string;
    name: string;
    kabupaten: string | null;
    provinsi: string | null;
    classification: TierKey;
    avg_completion: number;
  }>;
  topik: Array<{ name: string; avg_completion: number }>;
  narasumber: Array<{
    id: string;
    full_name: string;
    kategori: string | null;
    kompetensi: string | null;
  }>;
  summary_text: string | null;
};

const TIER_LABEL: Record<TierKey, string> = {
  unclassified: "Belum diklasifikasi",
  rintisan: "Rintisan",
  berkembang: "Berkembang",
  maju: "Maju",
  mandiri: "Mandiri",
};
const TIER_COLOR: Record<TierKey, string> = {
  unclassified: "bg-atr-bg-soft text-atr-fg-muted",
  rintisan: "bg-atr-yellow/25 text-atr-fg",
  berkembang: "bg-atr-purple-light/60 text-atr-purple-800",
  maju: "bg-atr-purple/15 text-atr-purple",
  mandiri: "bg-atr-arti/15 text-atr-arti",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  active: "Berjalan",
  completed: "Selesai",
  archived: "Diarsipkan",
};

async function fetchSummary(slug: string): Promise<SummaryResponse | null> {
  const supabase = createAdminClient();

  // 1) project + org by slug
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

  // 3) avg completion per project_desa
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

  // 4) topik avg
  const { data: ptRows } = await supabase
    .from("project_topik")
    .select("id, name, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });
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

  // 5) memberships (peserta + narasumber)
  const { data: memberRows } = await supabase
    .from("project_memberships")
    .select("user_id, role, status, user:users(id, full_name, kategori_narasumber, kompetensi)")
    .eq("project_id", projectId)
    .eq("status", "active");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members = (memberRows ?? []) as any[];
  const pesertaCount = members.filter((m) => m.role === "peserta").length;
  const narasumberRows = members.filter((m) => m.role === "narasumber");
  const narasumberCount = narasumberRows.length;
  // dedupe by user_id
  const seen = new Set<string>();
  const narasumber = [] as SummaryResponse["narasumber"];
  for (const m of narasumberRows) {
    if (!m.user || seen.has(m.user.id)) continue;
    seen.add(m.user.id);
    narasumber.push({
      id: m.user.id,
      full_name: m.user.full_name,
      kategori: m.user.kategori_narasumber ?? null,
      kompetensi: m.user.kompetensi ?? null,
    });
  }

  // 6) pendampingan session count + evidence count
  let sessionCount = 0;
  let evidenceCount = 0;
  if (projectDesaIds.length) {
    const [{ count: scnt }, { data: cps }] = await Promise.all([
      supabase
        .from("pendampingan_sessions")
        .select("id", { count: "exact", head: true })
        .in("project_desa_id", projectDesaIds),
      supabase
        .from("checklist_progress")
        .select("id, desa_topik_instance:desa_topik_instance!inner(project_desa_id)")
        .in("desa_topik_instance.project_desa_id", projectDesaIds),
    ]);
    sessionCount = scnt ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cpIds = ((cps ?? []) as any[]).map((c) => c.id);
    if (cpIds.length) {
      const { count: ecnt } = await supabase
        .from("evidence_tags")
        .select("id", { count: "exact", head: true })
        .eq("tag_type", "checklist_progress")
        .in("tag_target_id", cpIds);
      evidenceCount = ecnt ?? 0;
    }
  }

  // 7) AI summary (cached) — optional
  const { data: aiRow } = await supabase
    .from("ai_insights")
    .select("content, generated_at")
    .eq("target_type", "project")
    .eq("target_id", projectId)
    .eq("insight_type", "summary")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summaryText =
    (aiRow as any)?.content?.ringkasan_program ??
    (aiRow as any)?.content?.summary ??
    null;

  // Tier distribution
  const tier_dist: Record<TierKey, number> = {
    unclassified: 0,
    rintisan: 0,
    berkembang: 0,
    maju: 0,
    mandiri: 0,
  };
  for (const r of pdList) {
    const t = (r.desa?.current_classification as TierKey) ?? "unclassified";
    if (t in tier_dist) tier_dist[t]++;
    else tier_dist.unclassified++;
  }

  // Overall avg completion
  const completions = Array.from(completionByPd.values());
  const avgCompletion =
    completions.length > 0
      ? completions.reduce((a, b) => a + b, 0) / completions.length
      : 0;

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
    stats: {
      desa_count: pdList.length,
      peserta_count: pesertaCount,
      narasumber_count: narasumberCount,
      session_count: sessionCount,
      evidence_count: evidenceCount,
      avg_completion: avgCompletion,
    },
    tier_dist,
    desa: pdList.map((r) => ({
      id: r.desa?.id as string,
      name: (r.desa?.name as string) ?? "-",
      kabupaten: (r.desa?.kabupaten as string) ?? null,
      provinsi: (r.desa?.provinsi as string) ?? null,
      classification:
        ((r.desa?.current_classification as TierKey) ?? "unclassified"),
      avg_completion: completionByPd.get(r.id as string) ?? 0,
    })),
    topik: Array.from(topikAcc.values()).map((v) => ({
      name: v.name,
      avg_completion: v.count ? v.sum / v.count : 0,
    })),
    narasumber,
    summary_text: typeof summaryText === "string" ? summaryText : null,
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

  const statusLabel =
    STATUS_LABEL[summary.project.status] ?? summary.project.status;
  const maxTier = Math.max(...Object.values(summary.tier_dist), 1);

  return (
    <main className="min-h-screen bg-atr-bg-soft">
      {/* Header */}
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
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/80">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarRange className="h-3.5 w-3.5" />
                  {formatDate(summary.project.period_start)} –{" "}
                  {formatDate(summary.project.period_end)}
                </span>
                <span className="inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 font-bold">
                  {statusLabel}
                </span>
                {summary.organization && (
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {summary.organization.name}
                  </span>
                )}
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
        {/* KPI cards */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Kpi
            label="Desa peserta"
            value={summary.stats.desa_count.toString()}
            icon={MapPin}
          />
          <Kpi
            label="Peserta dampingan"
            value={summary.stats.peserta_count.toString()}
            icon={GraduationCap}
          />
          <Kpi
            label="Narasumber"
            value={summary.stats.narasumber_count.toString()}
            icon={Award}
          />
          <Kpi
            label="Sesi pendampingan"
            value={summary.stats.session_count.toString()}
            icon={CalendarRange}
          />
          <Kpi
            label="Bukti pendukung"
            value={summary.stats.evidence_count.toString()}
            icon={Paperclip}
          />
          <Kpi
            label="Rata-rata progress"
            value={`${Math.round(summary.stats.avg_completion)}%`}
            icon={Building2}
          />
        </section>

        {/* AI summary if available */}
        {summary.summary_text && (
          <section className="rounded-2xl border border-atr-purple/30 bg-atr-purple-50/50 p-6">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-atr-purple-600">
              Ringkasan Program
            </h2>
            <p className="whitespace-pre-line text-sm text-atr-fg">
              {summary.summary_text}
            </p>
          </section>
        )}

        {/* Klasifikasi distribution */}
        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
            Distribusi klasifikasi desa
          </h2>
          <p className="mb-4 text-xs text-atr-fg-muted">
            Berdasarkan tier klasifikasi nasional Permenpar (Rintisan → Mandiri).
          </p>
          <div className="space-y-2">
            {(
              ["mandiri", "maju", "berkembang", "rintisan", "unclassified"] as TierKey[]
            ).map((tier) => {
              const count = summary.tier_dist[tier];
              if (count === 0) return null;
              const pct = Math.round((count / maxTier) * 100);
              return (
                <div
                  key={tier}
                  className="flex items-center gap-3 text-sm"
                >
                  <span
                    className={`inline-flex w-32 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TIER_COLOR[tier]}`}
                  >
                    {TIER_LABEL[tier]}
                  </span>
                  <div className="flex-1">
                    <div className="h-3 overflow-hidden rounded-full bg-atr-bg-soft">
                      <div
                        className="h-full bg-atr-purple"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right font-bold text-atr-fg">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Topik breakdown */}
        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
            Progress per topik
          </h2>
          <div className="space-y-3">
            {summary.topik.length === 0 && (
              <p className="text-xs italic text-atr-fg-muted">
                Belum ada topik aktif di project ini.
              </p>
            )}
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

        {/* Desa peserta */}
        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
            Desa peserta
            <CountBadge n={summary.desa.length} />
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  <th className="py-2">Desa</th>
                  <th className="py-2">Lokasi</th>
                  <th className="py-2">Klasifikasi</th>
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
                    <td className="py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TIER_COLOR[d.classification]}`}
                      >
                        {TIER_LABEL[d.classification]}
                      </span>
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

        {/* Narasumber */}
        {summary.narasumber.length > 0 && (
          <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
              Tim narasumber
              <CountBadge n={summary.narasumber.length} />
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {summary.narasumber.map((n) => (
                <li
                  key={n.id}
                  className="rounded-xl border border-atr-outline bg-atr-bg-soft/40 p-3"
                >
                  <div className="text-sm font-bold text-atr-fg">
                    {n.full_name}
                  </div>
                  {n.kategori && (
                    <div className="text-[11px] font-bold uppercase tracking-wide text-atr-purple-600">
                      {n.kategori}
                    </div>
                  )}
                  {n.kompetensi && (
                    <div className="mt-1 text-xs text-atr-fg-muted">
                      {n.kompetensi}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

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

function Kpi({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight text-atr-fg">
        {value}
      </div>
    </div>
  );
}
