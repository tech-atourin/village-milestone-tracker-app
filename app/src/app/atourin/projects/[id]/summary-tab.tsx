import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  Award,
  ChevronRight,
} from "lucide-react";
import { getProjectAnalytics } from "@/server/queries/project-analytics";
import { createAdminClient } from "@/lib/supabase/server";
import { CountBadge } from "@/components/ui/count-badge";

type DesaCardData = {
  project_desa_id: string;
  desa_id: string;
  desa_name: string;
  tier: string;
  // Project-checklist completion % for this desa (not the desa baseline form).
  checklist_pct: number;
  peserta_count: number;
  checklist_total: number;
  rapor_avg_delta: number | null;
  sessions_count: number;
  action_plans_done: number;
  action_plans_total: number;
  summary_overview: string | null;
  generated_at: string | null;
};

async function loadProjectSummary(projectId: string): Promise<{
  project_name: string;
  total_desa: number;
  total_peserta: number;
  avg_delta_test: number | null;
  pre_avg: number | null;
  post_avg: number | null;
  desa_cards: DesaCardData[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  overall_overview: string;
}> {
  const admin = createAdminClient();
  const analytics = await getProjectAnalytics(projectId);

  // Pull rapor avg per peserta + aggregate
  const { data: rapor } = await admin
    .from("rapor_peserta")
    .select("user_id, pre_test_score, post_test_score")
    .eq("project_id", projectId);
  const rows = (rapor ?? []) as Array<{
    user_id: string;
    pre_test_score: number | null;
    post_test_score: number | null;
  }>;
  const pres = rows.map((r) => r.pre_test_score).filter((v): v is number => v != null);
  const posts = rows.map((r) => r.post_test_score).filter((v): v is number => v != null);
  const preAvg = pres.length ? pres.reduce((a, b) => a + b, 0) / pres.length : null;
  const postAvg = posts.length ? posts.reduce((a, b) => a + b, 0) / posts.length : null;
  const avgDelta =
    preAvg != null && postAvg != null ? Math.round(postAvg - preAvg) : null;

  // Per-desa summary insights (existing AI summaries)
  const { data: pdRows } = await admin
    .from("project_desa")
    .select(
      "id, desa_id, desa:desa(name, current_classification)",
    )
    .eq("project_id", projectId);
  const pdList = (pdRows ?? []) as Array<{
    id: string;
    desa_id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    desa: any;
  }>;

  const pdIds = pdList.map((p) => p.id);

  const { data: insights } =
    pdIds.length > 0
      ? await admin
          .from("ai_insights")
          .select("target_id, content, generated_at")
          .eq("target_type", "project_desa")
          .eq("insight_type", "summary")
          .in("target_id", pdIds)
      : { data: [] as unknown };
  const summaryByPd = new Map<
    string,
    { overview: string; generated_at: string }
  >();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of ((insights ?? []) as any[])) {
    summaryByPd.set(r.target_id as string, {
      overview: (r.content as { overview?: string }).overview ?? "",
      generated_at: r.generated_at,
    });
  }

  // Use top_desa as the per-desa source of truth (already aggregated by analytics query)
  const topDesaByDesaId = new Map(
    analytics.top_desa.map((r) => [r.desa_id, r]),
  );

  // Per-desa action plan counts (live aggregate)
  const { data: apRows } =
    pdIds.length > 0
      ? await admin
          .from("desa_action_plans")
          .select("project_desa_id, status")
          .in("project_desa_id", pdIds)
      : { data: [] as unknown };
  const actionByPd = new Map<string, { done: number; total: number }>();
  for (const r of ((apRows ?? []) as Array<{
    project_desa_id: string;
    status: string;
  }>)) {
    const cur = actionByPd.get(r.project_desa_id) ?? { done: 0, total: 0 };
    cur.total += 1;
    if (r.status === "selesai") cur.done += 1;
    actionByPd.set(r.project_desa_id, cur);
  }

  // Per-desa peserta count (only `peserta` role memberships)
  const { data: pesertaRows } = await admin
    .from("project_memberships")
    .select("desa_id")
    .eq("project_id", projectId)
    .eq("role", "peserta")
    .eq("status", "active");
  const pesertaByDesa = new Map<string, number>();
  for (const r of (pesertaRows ?? []) as Array<{ desa_id: string | null }>) {
    if (!r.desa_id) continue;
    pesertaByDesa.set(r.desa_id, (pesertaByDesa.get(r.desa_id) ?? 0) + 1);
  }

  // Project-wide checklist item count (same number applies to every desa
  // since checklist items live on project_topik, not per-desa).
  const { data: topikRows } = await admin
    .from("project_topik")
    .select("id")
    .eq("project_id", projectId);
  const projectTopikIds = ((topikRows ?? []) as Array<{ id: string }>).map(
    (r) => r.id,
  );
  let checklistTotal = 0;
  if (projectTopikIds.length > 0) {
    const { count } = await admin
      .from("project_checklist_item")
      .select("id", { count: "exact", head: true })
      .in("project_topik_id", projectTopikIds);
    checklistTotal = count ?? 0;
  }

  const desaCards: DesaCardData[] = pdList.map((pd) => {
    const s = summaryByPd.get(pd.id);
    const ap = actionByPd.get(pd.id) ?? { done: 0, total: 0 };
    const td = topDesaByDesaId.get(pd.desa_id);
    return {
      project_desa_id: pd.id,
      desa_id: pd.desa_id,
      desa_name: pd.desa?.name ?? "-",
      tier: pd.desa?.current_classification ?? "unclassified",
      checklist_pct: td?.completion_pct ?? 0,
      peserta_count: pesertaByDesa.get(pd.desa_id) ?? 0,
      checklist_total: checklistTotal,
      rapor_avg_delta: avgDelta,
      sessions_count: td?.sessions_done ?? 0,
      action_plans_done: ap.done,
      action_plans_total: ap.total,
      summary_overview: s?.overview ?? null,
      generated_at: s?.generated_at ?? null,
    };
  });

  // Derive SWOT from real aggregates
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];

  // Narasumber roster: anyone with a session in this project OR a narasumber
  // role membership. We surface this so SWOT reflects the new peserta/narasumber
  // split in the project detail tabs.
  const narasumberIds = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nsSessions } = await admin
    .from("pendampingan_sessions")
    .select("narasumber_id")
    .eq("project_id", projectId);
  for (const r of (nsSessions ?? []) as Array<{ narasumber_id: string | null }>) {
    if (r.narasumber_id) narasumberIds.add(r.narasumber_id);
  }

  // Kuisioner narasumber aggregate (Top Narasumber chart source of truth).
  const { data: ratingRows } = await admin
    .from("narasumber_ratings")
    .select("rating")
    .eq("project_id", projectId);
  const ratingArr = (ratingRows ?? []) as Array<{ rating: number }>;
  const ratingAvg =
    ratingArr.length > 0
      ? ratingArr.reduce((a, r) => a + r.rating, 0) / ratingArr.length
      : null;

  const highTier = desaCards.filter(
    (d) => d.tier === "maju" || d.tier === "mandiri",
  ).length;
  if (highTier > 0)
    strengths.push(
      `${highTier} desa sudah di tier Maju/Mandiri - siap jadi best-practice case study.`,
    );
  if (avgDelta != null && avgDelta > 10)
    strengths.push(
      `Rata-rata peningkatan post-test +${avgDelta} poin - pelatihan efektif.`,
    );
  if (analytics.sessions_submitted + analytics.sessions_verified > 0)
    strengths.push(
      `${analytics.sessions_submitted + analytics.sessions_verified} sesi pendampingan sudah submitted oleh narasumber.`,
    );
  if (ratingAvg != null && ratingAvg >= 4)
    strengths.push(
      `Rata-rata kuisioner narasumber ★ ${ratingAvg.toFixed(1)} dari ${ratingArr.length} penilaian - kualitas narasumber dipersepsi tinggi.`,
    );

  const lowChecklist = desaCards.filter((d) => d.checklist_pct < 50).length;
  if (lowChecklist > 0)
    weaknesses.push(
      `${lowChecklist} desa progress checklist-nya < 50% - perlu dorongan kelengkapan evidence.`,
    );
  const noSessions = desaCards.filter((d) => d.sessions_count === 0).length;
  if (noSessions > 0)
    weaknesses.push(
      `${noSessions} desa belum punya sesi pendampingan tercatat.`,
    );
  if (avgDelta != null && avgDelta < 5)
    weaknesses.push(
      `Peningkatan test masih rendah (${avgDelta} poin) - review materi & pendekatan.`,
    );
  if (ratingAvg != null && ratingAvg < 3.5)
    weaknesses.push(
      `Kuisioner narasumber baru ★ ${ratingAvg.toFixed(1)} - peserta belum sepenuhnya puas dengan pendampingan.`,
    );

  const submitted = analytics.hub_assessment_results.length;
  if (submitted > 0)
    opportunities.push(
      `${submitted} desa sudah mengisi Assessment Klasifikasi Desa V2 (Atourin) - bisa langsung diverifikasi.`,
    );
  opportunities.push(
    "Linked Hub Atourin (5.964 desa) memungkinkan benchmarking lintas project.",
  );
  if (analytics.action_plans_total > 0)
    opportunities.push(
      `${analytics.action_plans_total} rencana aksi tercatat - kerangka follow-up sudah jelas.`,
    );
  if (narasumberIds.size > 0)
    opportunities.push(
      `${narasumberIds.size} narasumber aktif - kapasitas pendampingan tersedia.`,
    );

  const stagnantDesa = desaCards.filter(
    (d) => d.action_plans_total === 0 && d.sessions_count === 0,
  ).length;
  if (stagnantDesa > 0)
    threats.push(
      `${stagnantDesa} desa tanpa rencana aksi & tanpa sesi - risiko stagnasi.`,
    );
  if (
    analytics.action_plans_total > 0 &&
    analytics.action_plans_by_status.selesai === 0
  )
    threats.push(
      "Belum ada rencana aksi yang sudah selesai - tindak lanjut belum membuahkan bukti.",
    );
  if (
    desaCards.filter((d) => d.tier === "unclassified" || d.tier === "rintisan")
      .length /
      Math.max(desaCards.length, 1) >
    0.6
  )
    threats.push(
      "> 60% desa masih Rintisan/Unclassified - gap antar-desa cukup lebar.",
    );

  // Overall overview (deterministic narrative from data)
  const desaCount = desaCards.length;
  const overallOverview = [
    `Project "${analytics.project.name}" mendampingi ${desaCount} desa wisata dengan total ${analytics.peserta_total} peserta` +
      (narasumberIds.size > 0
        ? ` dan ${narasumberIds.size} narasumber.`
        : "."),
    analytics.sessions_total > 0
      ? `Sudah ada ${analytics.sessions_total} sesi pendampingan tercatat (${analytics.sessions_submitted + analytics.sessions_verified} sudah submitted).`
      : "Belum ada sesi pendampingan tercatat.",
    avgDelta != null
      ? `Rata-rata pre-test ${Math.round(preAvg!)} → post-test ${Math.round(postAvg!)} (Δ ${avgDelta > 0 ? "+" : ""}${avgDelta}).`
      : "Data pre/post-test belum lengkap untuk semua peserta.",
    ratingAvg != null
      ? `Kuisioner narasumber ★ ${ratingAvg.toFixed(1)} dari ${ratingArr.length} penilaian.`
      : "Kuisioner narasumber belum diisi peserta.",
    analytics.action_plans_total > 0
      ? `${analytics.action_plans_total} rencana aksi terdaftar, ${analytics.action_plans_by_status.selesai} selesai.`
      : "Belum ada rencana aksi tercatat.",
  ].join(" ");

  return {
    project_name: analytics.project.name,
    total_desa: desaCount,
    total_peserta: analytics.peserta_total,
    avg_delta_test: avgDelta,
    pre_avg: preAvg,
    post_avg: postAvg,
    desa_cards: desaCards,
    swot: { strengths, weaknesses, opportunities, threats },
    overall_overview: overallOverview,
  };
}

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

export async function SummaryTab({
  projectId,
  scope = "atourin",
}: {
  projectId: string;
  scope?: "atourin" | "mitra" | "narasumber";
}) {
  const summary = await loadProjectSummary(projectId);
  return (
    <div className="space-y-6">
      {/* Overall summary card */}
      <article className="rounded-2xl border border-atr-purple/30 bg-gradient-to-br from-atr-purple-50 to-white p-6 shadow-atr-1">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-atr-purple-600">
          <Sparkles className="h-3.5 w-3.5" />
          Ringkasan Program (Auto-generated)
        </div>
        <h2 className="mt-1 text-lg font-bold text-atr-fg">
          {summary.project_name}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-atr-fg">
          {summary.overall_overview}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MiniStat
            label="Total Desa"
            value={summary.total_desa}
            hint={`${summary.desa_cards.filter((d) => d.tier === "maju" || d.tier === "mandiri").length} di tier Maju+`}
          />
          <MiniStat
            label="Total Peserta"
            value={summary.total_peserta}
            hint={
              summary.pre_avg != null
                ? `Avg pre/post ${Math.round(summary.pre_avg!)} / ${Math.round(summary.post_avg!)}`
                : "Belum ada test result"
            }
          />
          <MiniStat
            label="Δ Test"
            value={summary.avg_delta_test ?? 0}
            suffix={summary.avg_delta_test != null ? " poin" : ""}
            hint={
              summary.avg_delta_test != null
                ? summary.avg_delta_test > 0
                  ? "Naik"
                  : "Turun"
                : "Perlu data pre/post"
            }
            color={
              summary.avg_delta_test != null && summary.avg_delta_test > 0
                ? "green"
                : summary.avg_delta_test != null && summary.avg_delta_test < 0
                  ? "red"
                  : "muted"
            }
          />
        </div>
      </article>

      {/* SWOT */}
      <section>
        <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          <Target className="h-4 w-4 text-atr-purple" />
          SWOT Pointer
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <SwotCard
            title="Strengths"
            icon={Award}
            color="green"
            items={summary.swot.strengths}
            emptyHint="Belum cukup data untuk identifikasi kekuatan."
          />
          <SwotCard
            title="Weaknesses"
            icon={AlertTriangle}
            color="red"
            items={summary.swot.weaknesses}
            emptyHint="Belum ada kelemahan signifikan terdeteksi."
          />
          <SwotCard
            title="Opportunities"
            icon={Lightbulb}
            color="yellow"
            items={summary.swot.opportunities}
            emptyHint="Belum ada peluang teridentifikasi."
          />
          <SwotCard
            title="Threats"
            icon={TrendingUp}
            color="purple"
            items={summary.swot.threats}
            emptyHint="Belum ada risiko terdeteksi."
          />
        </div>
      </section>

      {/* Per-desa summary cards */}
      <section>
        <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          <Sparkles className="h-4 w-4 text-atr-purple" />
          Ringkasan per Desa
          <CountBadge n={summary.desa_cards.length} />
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {summary.desa_cards.map((d) => (
            <article
              key={d.project_desa_id}
              className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-atr-fg">{d.desa_name}</h4>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      TIER_BADGE[d.tier]
                    }`}
                  >
                    <Award className="h-3 w-3" />
                    {TIER_LABEL[d.tier] ?? d.tier}
                  </span>
                </div>
                <Link
                  href={`/${scope}/projects/${projectId}/desa/${d.project_desa_id}?from=${encodeURIComponent(
                    `/${scope}/projects/${projectId}?tab=summary`,
                  )}`}
                  className="shrink-0 text-xs font-bold text-atr-purple-600 hover:underline"
                >
                  Detail
                  <ChevronRight className="ml-0.5 inline h-3 w-3" />
                </Link>
              </div>
              {d.summary_overview ? (
                <p className="mt-3 line-clamp-3 text-xs text-atr-fg">
                  {d.summary_overview}
                </p>
              ) : (
                <p className="mt-3 text-xs italic text-atr-fg-muted">
                  Belum ada AI summary di-generate untuk desa ini.
                </p>
              )}
              <div className="mt-3 grid grid-cols-5 gap-2 rounded-lg border border-atr-outline bg-atr-bg-soft p-2 text-center">
                <Mini label="Checklist" value={`${d.checklist_pct}%`} />
                <Mini label="Sesi" value={String(d.sessions_count)} />
                <Mini
                  label="Aksi"
                  value={`${d.action_plans_done}/${d.action_plans_total}`}
                />
                <Mini label="Peserta" value={String(d.peserta_count)} />
                <Mini label="Item" value={String(d.checklist_total)} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
  suffix,
  color = "muted",
}: {
  label: string;
  value: number | string;
  hint?: string;
  suffix?: string;
  color?: "muted" | "green" | "red";
}) {
  const colorCls =
    color === "green"
      ? "text-atr-arti"
      : color === "red"
        ? "text-atr-red"
        : "text-atr-fg";
  return (
    <div className="rounded-lg border border-atr-outline bg-white p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className={`mt-1 text-xl font-bold ${colorCls}`}>
        {value}
        {suffix}
      </div>
      {hint && <div className="text-[11px] text-atr-fg-muted">{hint}</div>}
    </div>
  );
}

function SwotCard({
  title,
  icon: Icon,
  color,
  items,
  emptyHint,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "green" | "red" | "yellow" | "purple";
  items: string[];
  emptyHint: string;
}) {
  const palette: Record<string, string> = {
    green: "border-atr-arti/30 bg-atr-arti/5 text-atr-arti",
    red: "border-atr-red/30 bg-atr-red/5 text-atr-red",
    yellow: "border-atr-yellow/40 bg-atr-yellow/10 text-atr-fg",
    purple: "border-atr-purple/30 bg-atr-purple-50/40 text-atr-purple-600",
  };
  return (
    <article className={`rounded-2xl border p-4 ${palette[color]}`}>
      <header className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </header>
      {items.length === 0 ? (
        <p className="text-xs italic opacity-70">{emptyHint}</p>
      ) : (
        <ul className="space-y-1.5 text-xs text-atr-fg">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-atr-fg-muted" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className="text-sm font-bold text-atr-fg">{value}</div>
    </div>
  );
}
