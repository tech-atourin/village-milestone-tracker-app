"use client";

import { useState, useTransition } from "react";
import {
  Lightbulb,
  Loader2,
  RefreshCw,
  Flame,
  TrendingUp,
} from "lucide-react";
import { regenerateDesaRecommendation } from "@/server/actions/ai";
import type {
  DesaRecommendation,
  RecommendationItem,
} from "@/lib/ai/desa-recommendation";

const PRIORITY_STYLE: Record<number, string> = {
  1: "bg-atr-red/15 text-atr-red border-atr-red/30",
  2: "bg-atr-yellow/25 text-atr-fg border-atr-yellow/40",
  3: "bg-atr-purple-50 text-atr-purple-600 border-atr-purple/30",
  4: "bg-atr-bg-soft text-atr-fg-muted border-atr-outline",
  5: "bg-atr-bg-soft text-atr-fg-muted border-atr-outline",
};

const PRIORITY_LABEL: Record<number, string> = {
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Backlog",
};

export function AiRecommendationCard({
  projectDesaId,
  initialData,
  initialError,
  cached,
}: {
  projectDesaId: string;
  initialData: DesaRecommendation | null;
  initialError: string | null;
  cached: boolean;
}) {
  const [data, setData] = useState<DesaRecommendation | null>(initialData);
  const [error, setError] = useState<string | null>(initialError);
  const [isCached, setIsCached] = useState(cached);
  const [pending, startTransition] = useTransition();

  function regenerate() {
    startTransition(async () => {
      const r = await regenerateDesaRecommendation(projectDesaId);
      if (r.error) {
        setError(r.error);
        setData(null);
      } else if (r.data) {
        setData(r.data);
        setError(null);
        setIsCached(r.cached ?? false);
      }
    });
  }

  const items: RecommendationItem[] = data?.items ?? [];

  return (
    <section className="rounded-2xl border border-atr-yellow/30 bg-atr-yellow/5 p-5 shadow-atr-1">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-atr-yellow" />
          <h2 className="text-sm font-bold text-atr-fg">
            AI Recommendations
            {isCached && data && (
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
                · cached 24h
              </span>
            )}
          </h2>
        </div>
        <button
          type="button"
          onClick={regenerate}
          disabled={pending}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-atr-outline bg-white px-2 text-[11px] font-bold text-atr-fg transition hover:bg-atr-bg-soft disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {data ? "Refresh" : "Generate"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-atr-outline bg-white p-3 text-xs text-atr-fg-muted">
          {error}
        </div>
      )}

      {!data && !error && !pending && (
        <p className="rounded-lg border border-atr-outline bg-white p-4 text-xs italic text-atr-fg-muted">
          Klik &quot;Generate&quot; untuk dapat 5 action item prioritas dari AI
          berdasarkan baseline + progress desa.
        </p>
      )}

      {pending && !data && (
        <p className="rounded-lg border border-atr-outline bg-white p-4 text-xs text-atr-fg-muted">
          Menyusun rekomendasi…
        </p>
      )}

      {items.length > 0 && (
        <ol className="space-y-2">
          {items
            .sort((a, b) => a.priority - b.priority)
            .map((item, i) => (
              <li
                key={i}
                className={`rounded-lg border bg-white p-3 ${PRIORITY_STYLE[item.priority]}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-xs font-bold">
                    {item.priority}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-bold text-atr-fg">
                        {item.action}
                      </span>
                      <span className="inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        {PRIORITY_LABEL[item.priority]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-atr-fg">
                      <span className="font-bold">Why: </span>
                      {item.why}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-3 text-[11px]">
                      <span className="inline-flex items-center gap-1 text-atr-fg-muted">
                        <TrendingUp className="h-3 w-3" />
                        Impact: {item.expected_impact}
                      </span>
                      <span className="inline-flex items-center gap-1 text-atr-fg-muted">
                        <Flame className="h-3 w-3" />
                        Owner: {item.owner_hint}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
        </ol>
      )}
    </section>
  );
}
