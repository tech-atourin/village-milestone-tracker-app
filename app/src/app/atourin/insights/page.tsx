import Link from "next/link";
import {
  Sparkles,
  Lightbulb,
  AlertTriangle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

type InsightRow = {
  id: string;
  insight_type: "summary" | "recommendation" | "stagnation_flag" | "evidence_review";
  target_id: string;
  content: Record<string, unknown>;
  generated_at: string;
  valid_until: string | null;
  desa_name?: string;
  project_name?: string;
  project_id?: string;
};

async function loadInsights(): Promise<{
  summaries: InsightRow[];
  recommendations: InsightRow[];
  stagnations: InsightRow[];
}> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("ai_insights")
    .select(
      "id, insight_type, target_id, content, generated_at, valid_until",
    )
    .eq("target_type", "project_desa")
    .order("generated_at", { ascending: false })
    .limit(300);

  const arr = (rows ?? []) as unknown as InsightRow[];
  const desaIds = Array.from(new Set(arr.map((r) => r.target_id)));

  if (desaIds.length === 0) {
    return { summaries: [], recommendations: [], stagnations: [] };
  }

  const { data: pdRows } = await admin
    .from("project_desa")
    .select("id, project:projects(id, name), desa:desa(name)")
    .in("id", desaIds);
  const lookup = new Map<string, { project_name: string; project_id: string; desa_name: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const pd of (pdRows ?? []) as any[]) {
    lookup.set(pd.id, {
      project_name: pd.project?.name ?? "—",
      project_id: pd.project?.id ?? "",
      desa_name: pd.desa?.name ?? "—",
    });
  }

  const enriched = arr.map((r) => ({
    ...r,
    ...lookup.get(r.target_id),
  }));

  return {
    summaries: enriched.filter((r) => r.insight_type === "summary"),
    recommendations: enriched.filter((r) => r.insight_type === "recommendation"),
    stagnations: enriched.filter((r) => r.insight_type === "stagnation_flag"),
  };
}

function formatRel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (3600 * 1000));
  if (hours < 1) return "baru saja";
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function InsightsHubPage() {
  await requireRole("superadmin");
  const data = await loadInsights();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          AI Insights
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Semua AI summary, recommendation, dan stagnation alert dari Gemini
          terkumpul di sini.
        </p>
      </header>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-atr-purple" />
          <h2 className="text-sm font-bold text-atr-fg">
            Desa Summaries ({data.summaries.length})
          </h2>
        </div>
        {data.summaries.length === 0 ? (
          <EmptyCard message="Belum ada AI summary di-generate." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.summaries.map((r) => {
              const overview = (r.content as { overview?: string }).overview ?? "";
              return (
                <li
                  key={r.id}
                  className="rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-atr-fg">
                        {r.desa_name}
                      </div>
                      <div className="text-xs text-atr-fg-muted">
                        {r.project_name}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-atr-fg-muted">
                      {formatRel(r.generated_at)}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-xs text-atr-fg">
                    {overview}
                  </p>
                  <Link
                    href={`/atourin/projects/${r.project_id}/desa/${r.target_id}`}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-atr-purple hover:text-atr-purple-600"
                  >
                    Lihat detail
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-atr-yellow" />
          <h2 className="text-sm font-bold text-atr-fg">
            Recommendations ({data.recommendations.length})
          </h2>
        </div>
        {data.recommendations.length === 0 ? (
          <EmptyCard message="Belum ada AI recommendation di-generate." />
        ) : (
          <ul className="space-y-2">
            {data.recommendations.map((r) => {
              const items = ((r.content as { items?: Array<{ action: string; priority: number }> }).items) ?? [];
              return (
                <li
                  key={r.id}
                  className="rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-atr-fg">
                        {r.desa_name}{" "}
                        <span className="font-normal text-atr-fg-muted">
                          · {r.project_name}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-atr-fg-muted">
                        Top {items.length} actions · {formatRel(r.generated_at)}
                      </div>
                      {items.slice(0, 3).map((it, i) => (
                        <div key={i} className="mt-2 flex items-start gap-2 text-xs">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-atr-purple-50 text-[10px] font-bold text-atr-purple">
                            {it.priority}
                          </span>
                          <span className="text-atr-fg">{it.action}</span>
                        </div>
                      ))}
                    </div>
                    <Link
                      href={`/atourin/projects/${r.project_id}/desa/${r.target_id}`}
                      className="shrink-0 text-xs font-bold text-atr-purple hover:text-atr-purple-600"
                    >
                      Lihat →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-atr-red" />
          <h2 className="text-sm font-bold text-atr-fg">
            Stagnation Alerts ({data.stagnations.length})
          </h2>
        </div>
        {data.stagnations.length === 0 ? (
          <EmptyCard message="Belum ada desa stagnan terdeteksi 🎉" />
        ) : (
          <ul className="space-y-2">
            {data.stagnations.map((r) => {
              const c = r.content as { days_idle?: number; last_submission_at?: string };
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-2xl border border-atr-red/30 bg-atr-red/5 p-4"
                >
                  <Clock className="h-5 w-5 shrink-0 text-atr-red" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-atr-fg">
                      {r.desa_name}
                    </div>
                    <div className="text-xs text-atr-fg-muted">
                      {r.project_name} · {c.days_idle ?? "?"} hari idle
                    </div>
                  </div>
                  <Link
                    href={`/atourin/projects/${r.project_id}/desa/${r.target_id}`}
                    className="text-xs font-bold text-atr-red hover:underline"
                  >
                    Intervensi →
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-8 text-center text-sm text-atr-fg-muted">
      {message}
    </div>
  );
}
