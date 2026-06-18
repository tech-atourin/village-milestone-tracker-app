import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  Target,
} from "lucide-react";
import { getProjectDesa } from "@/server/queries/desa";
import { listPesertaTopik } from "@/server/queries/peserta";
import { createClient } from "@/lib/supabase/server";
import { aiProvider } from "@/lib/ai/provider";
import type { DesaSummary } from "@/lib/ai/desa-summary";
import type { DesaRecommendation } from "@/lib/ai/desa-recommendation";
import { AiSummaryCard } from "./ai-summary-card";
import { AiRecommendationCard } from "./ai-recommendation-card";
import { SwotCard } from "./swot-card";
import { sanitizeBackHref } from "@/lib/nav/back-href";

export type DesaSwot = {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
};

async function fetchCachedInsight<T>(
  projectDesaId: string,
  type: "summary" | "recommendation" | "swot",
): Promise<{ content: T | null; cached: boolean }> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ai_insights")
    .select("content, valid_until")
    .eq("target_type", "project_desa")
    .eq("target_id", projectDesaId)
    .eq("insight_type", type)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return { content: null, cached: false };
  const row = data as { content: T; valid_until: string | null };
  const stillValid = row.valid_until
    ? new Date(row.valid_until) > new Date()
    : true;
  return { content: row.content, cached: stillValid };
}

const STATUS_STYLE = {
  not_started: "bg-atr-bg-soft text-atr-fg-muted",
  in_progress: "bg-atr-yellow/25 text-atr-fg",
  completed: "bg-atr-arti/15 text-atr-arti",
  needs_revision: "bg-atr-red/15 text-atr-red",
} as const;

const STATUS_LABEL = {
  not_started: "Belum mulai",
  in_progress: "Berjalan",
  completed: "Selesai",
  needs_revision: "Perlu revisi",
} as const;

export async function ProjectDesaDetailView({
  projectId,
  projectDesaId,
  scope,
  backFrom,
}: {
  projectId: string;
  projectDesaId: string;
  scope: "atourin" | "mitra";
  backFrom?: string;
}) {
  const defaultBack = `/${scope}/projects/${projectId}?tab=desa`;
  const backHref = sanitizeBackHref(backFrom, defaultBack);
  const backLabel =
    backHref === defaultBack ? "Kembali ke daftar desa" : "Kembali";
  // NOTE: param is `desaId` in the route but it actually carries project_desa.id
  const detail = await getProjectDesa(projectId, projectDesaId);
  if (!detail) return null;

  const [topik, cachedSummary, cachedRec, cachedSwot] = await Promise.all([
    listPesertaTopik(projectDesaId),
    fetchCachedInsight<DesaSummary>(projectDesaId, "summary"),
    fetchCachedInsight<DesaRecommendation>(projectDesaId, "recommendation"),
    fetchCachedInsight<DesaSwot>(projectDesaId, "swot"),
  ]);
  const aiReady = aiProvider().isReady();
  const overall =
    topik.length > 0
      ? topik.reduce((acc, t) => acc + t.completion_percent, 0) / topik.length
      : 0;
  const approvedTotal = topik.reduce((acc, t) => acc + t.approved_items, 0);
  const pendingTotal = topik.reduce((acc, t) => acc + t.pending_items, 0);
  const itemTotal = topik.reduce((acc, t) => acc + t.total_items, 0);

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-atr-purple-50 text-atr-purple">
            <MapPin className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
              {detail.desa.name}
            </h1>
            <div className="text-sm text-atr-fg-muted">
              {[detail.desa.kabupaten, detail.desa.provinsi]
                .filter(Boolean)
                .join(" · ") || "Lokasi belum diisi"}
            </div>
            <div className="text-xs text-atr-fg-muted">
              Project: {detail.project.name}
            </div>
            <div className="text-xs text-atr-fg-muted">
              Mitra: {detail.project.organization.name}
            </div>
            {detail.coordinator && (
              <div className="text-xs text-atr-fg-muted">
                Koordinator: {detail.coordinator.full_name}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-4">
        <SummaryCard
          label="Progress overall"
          value={`${Math.round(overall)}%`}
          highlight
        />
        <SummaryCard label="Topik" value={topik.length.toString()} />
        <SummaryCard
          label="Item disetujui"
          value={`${approvedTotal} / ${itemTotal}`}
        />
        <SummaryCard label="Menunggu review" value={pendingTotal.toString()} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AiSummaryCard
          projectDesaId={projectDesaId}
          initialSummary={cachedSummary.content}
          initialError={
            aiReady ? null : "GEMINI_API_KEY belum di-set di .env.local."
          }
          cached={cachedSummary.cached}
        />
        <AiRecommendationCard
          projectDesaId={projectDesaId}
          initialData={cachedRec.content}
          initialError={
            aiReady ? null : "GEMINI_API_KEY belum di-set di .env.local."
          }
          cached={cachedRec.cached}
        />
      </div>

      <SwotCard
        projectDesaId={projectDesaId}
        initialSwot={cachedSwot.content}
        initialError={
          aiReady ? null : "GEMINI_API_KEY belum di-set di .env.local."
        }
        cached={cachedSwot.cached}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          Progress per topik
        </h2>
        <ul className="space-y-2">
          {topik.map((t) => (
            <li
              key={t.project_topik_id}
              className="rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-atr-purple-50 text-xs font-bold text-atr-purple">
                  {t.sort_order || "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-atr-fg">{t.name}</h3>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[t.status]}`}
                    >
                      {STATUS_LABEL[t.status]}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-atr-fg-muted">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-atr-arti" />
                      {t.approved_items} approved
                    </span>
                    {t.pending_items > 0 ? (
                      <Link
                        href={`/${scope}/projects/${projectId}?tab=evidence&topik=${t.project_topik_id}&desa=${projectDesaId}`}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold text-atr-fg transition hover:bg-atr-yellow/20"
                      >
                        <Clock className="h-3 w-3 text-atr-yellow" />
                        {t.pending_items} pending
                        <span className="text-[10px] text-atr-purple-600">
                          → tinjau
                        </span>
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-atr-yellow" />
                        {t.pending_items} pending
                      </span>
                    )}
                    <span>{t.total_items} total</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-atr-bg-soft">
                    <div
                      className="h-full bg-atr-purple transition-all"
                      style={{ width: `${Math.round(t.completion_percent)}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm font-bold text-atr-fg">
                  {Math.round(t.completion_percent)}%
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-atr-1 ${
        highlight
          ? "border-atr-purple/30 bg-atr-purple-50"
          : "border-atr-outline bg-white"
      }`}
    >
      <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-bold ${
          highlight ? "text-atr-purple-600" : "text-atr-fg"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// SWOT card - analisis dari hasil pendampingan narasumber, rencana aksi
// peserta, dan baseline data desa. Disimpan di ai_insights dengan
// insight_type='swot' (boleh AI-generated atau manual seed).
export function SwotCardSection({ swot }: { swot: DesaSwot }) {
  return (
    <section className="space-y-3">
      <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
        <Target className="h-4 w-4 text-atr-purple" />
        SWOT Analysis Desa
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <SwotQuadrant
          title="Strengths"
          icon={Award}
          palette="green"
          items={swot.strengths}
          emptyHint="Belum ada kekuatan teridentifikasi."
        />
        <SwotQuadrant
          title="Weaknesses"
          icon={AlertCircle}
          palette="red"
          items={swot.weaknesses}
          emptyHint="Belum ada kelemahan teridentifikasi."
        />
        <SwotQuadrant
          title="Opportunities"
          icon={Lightbulb}
          palette="yellow"
          items={swot.opportunities}
          emptyHint="Belum ada peluang teridentifikasi."
        />
        <SwotQuadrant
          title="Threats"
          icon={TrendingUp}
          palette="purple"
          items={swot.threats}
          emptyHint="Belum ada ancaman teridentifikasi."
        />
      </div>
    </section>
  );
}

function SwotQuadrant({
  title,
  icon: Icon,
  palette,
  items,
  emptyHint,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  palette: "green" | "red" | "yellow" | "purple";
  items: string[];
  emptyHint: string;
}) {
  const styles: Record<string, string> = {
    green: "border-atr-arti/30 bg-atr-arti/5 text-atr-arti",
    red: "border-atr-red/30 bg-atr-red/5 text-atr-red",
    yellow: "border-atr-yellow/40 bg-atr-yellow/10 text-atr-fg",
    purple: "border-atr-purple/30 bg-atr-purple-50/50 text-atr-purple-600",
  };
  return (
    <article className={`rounded-2xl border p-4 ${styles[palette]}`}>
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
