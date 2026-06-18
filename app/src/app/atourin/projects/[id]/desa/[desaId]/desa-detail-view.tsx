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
import { getCurrentUser } from "@/lib/auth/rbac";
import { aiProvider } from "@/lib/ai/provider";
import type { DesaSummary } from "@/lib/ai/desa-summary";
import type { DesaRecommendation } from "@/lib/ai/desa-recommendation";
import { AiSummaryCard } from "./ai-summary-card";
import { AiRecommendationCard } from "./ai-recommendation-card";
import { SwotCard } from "./swot-card";
import { TopikReviewer } from "./topik-reviewer";
import { sanitizeBackHref } from "@/lib/nav/back-href";
import { listTopikReviewForDesa } from "@/server/queries/review";

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
  const currentUser = await getCurrentUser();
  const currentUserId = currentUser?.id ?? "";

  const supabase = createClient();
  const [
    topik,
    topikGroups,
    cachedSummary,
    cachedRec,
    cachedSwot,
    sessionCounts,
    actionPlanCounts,
  ] = await Promise.all([
    listPesertaTopik(projectDesaId),
    listTopikReviewForDesa(projectDesaId),
    fetchCachedInsight<DesaSummary>(projectDesaId, "summary"),
    fetchCachedInsight<DesaRecommendation>(projectDesaId, "recommendation"),
    fetchCachedInsight<DesaSwot>(projectDesaId, "swot"),
    // Narasumber sessions with content (materi or aktivitas filled)
    supabase
      .from("pendampingan_sessions")
      .select("id, materi, aktivitas, status")
      .eq("project_desa_id", projectDesaId)
      .then(({ data }) => {
        const rows = (data ?? []) as Array<{
          materi: string | null;
          aktivitas: string | null;
          status: string;
        }>;
        return rows.filter(
          (r) =>
            r.status === "verified" ||
            (r.materi && r.materi.trim().length > 5) ||
            (r.aktivitas && r.aktivitas.trim().length > 5),
        ).length;
      }),
    // Action plans that have moved past "rencana" (started)
    supabase
      .from("desa_action_plans")
      .select("status")
      .eq("project_desa_id", projectDesaId)
      .then(({ data }) => {
        const rows = (data ?? []) as Array<{ status: string }>;
        const started = rows.filter((r) => r.status !== "rencana").length;
        return { total: rows.length, started };
      }),
  ]);
  const aiReady = aiProvider().isReady();
  const overall =
    topik.length > 0
      ? topik.reduce((acc, t) => acc + t.completion_percent, 0) / topik.length
      : 0;
  const approvedTotal = topik.reduce((acc, t) => acc + t.approved_items, 0);
  const pendingTotal = topik.reduce((acc, t) => acc + t.pending_items, 0);
  const itemTotal = topik.reduce((acc, t) => acc + t.total_items, 0);

  // Gate AI section: only show when pendampingan is "complete enough" so the
  // AI input data is meaningful. Checks:
  // 1. Every topik fully approved (no pending, approved === total, total > 0)
  // 2. At least one narasumber session has content / is verified
  // 3. At least one rencana aksi has started (status !== 'rencana')
  const allTopikDone =
    topikGroups.length > 0 &&
    topikGroups.every(
      (g) =>
        g.total_count > 0 &&
        g.pending_count === 0 &&
        g.approved_count === g.total_count,
    );
  const aiUnlocked =
    allTopikDone && sessionCounts > 0 && actionPlanCounts.started > 0;
  const aiPrerequisites = [
    {
      met: allTopikDone,
      label: "Semua topik checklist sudah disetujui (tidak ada pending)",
    },
    {
      met: sessionCounts > 0,
      label: "Narasumber sudah mengisi catatan pendampingan",
    },
    {
      met: actionPlanCounts.started > 0,
      label: "Rencana aksi sudah mulai dikerjakan",
    },
  ];

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

      {aiUnlocked ? (
        <>
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
        </>
      ) : (
        <section className="rounded-2xl border border-dashed border-atr-outline bg-atr-bg-soft/40 p-5">
          <header className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-atr-purple-50 text-atr-purple">
              ✨
            </span>
            <div>
              <h3 className="text-sm font-bold text-atr-fg">
                Analisis AI (Summary, Rekomendasi, SWOT)
              </h3>
              <p className="text-xs text-atr-fg-muted">
                Akan muncul otomatis setelah pendampingan cukup matang untuk
                dianalisis.
              </p>
            </div>
          </header>
          <ul className="space-y-1.5 text-xs">
            {aiPrerequisites.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    p.met
                      ? "bg-atr-arti/20 text-atr-arti"
                      : "bg-atr-outline/40 text-atr-fg-muted"
                  }`}
                >
                  {p.met ? "✓" : "•"}
                </span>
                <span
                  className={p.met ? "text-atr-fg" : "text-atr-fg-muted"}
                >
                  {p.label}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <TopikReviewer
        projectId={projectId}
        groups={topikGroups}
        canReview={scope === "atourin" || scope === "mitra"}
        currentUserId={currentUserId}
      />
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
