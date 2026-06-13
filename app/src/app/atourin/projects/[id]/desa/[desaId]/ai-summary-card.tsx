"use client";

import { useState, useTransition } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import { regenerateDesaSummary } from "@/server/actions/ai";
import type { DesaSummary } from "@/lib/ai/desa-summary";

export function AiSummaryCard({
  projectDesaId,
  initialSummary,
  initialError,
  cached,
}: {
  projectDesaId: string;
  initialSummary: DesaSummary | null;
  initialError: string | null;
  cached: boolean;
}) {
  const [summary, setSummary] = useState<DesaSummary | null>(initialSummary);
  const [error, setError] = useState<string | null>(initialError);
  const [isCached, setIsCached] = useState(cached);
  const [pending, startTransition] = useTransition();

  function regenerate() {
    startTransition(async () => {
      const r = await regenerateDesaSummary(projectDesaId);
      if (r.error) {
        setError(r.error);
        setSummary(null);
      } else if (r.data) {
        setSummary(r.data);
        setError(null);
        setIsCached(r.cached ?? false);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-atr-purple/30 bg-atr-purple-50/40 p-5 shadow-atr-1">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-atr-purple" />
          <h2 className="text-sm font-bold text-atr-fg">
            AI Summary
            {isCached && summary && (
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
                · cached
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
          {summary ? "Refresh" : "Generate"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-atr-outline bg-white p-3 text-xs text-atr-fg-muted">
          {error}
        </div>
      )}

      {!summary && !error && !pending && (
        <p className="rounded-lg border border-atr-outline bg-white p-4 text-xs italic text-atr-fg-muted">
          Klik &quot;Generate&quot; untuk membuat ringkasan AI dari baseline +
          progress desa.
        </p>
      )}

      {pending && !summary && (
        <p className="rounded-lg border border-atr-outline bg-white p-4 text-xs text-atr-fg-muted">
          Menyusun ringkasan…
        </p>
      )}

      {summary && (
        <div className="space-y-3">
          <div className="rounded-lg bg-white p-3.5 text-sm leading-relaxed text-atr-fg">
            {summary.overview}
          </div>

          {summary.highlights.length > 0 && (
            <SubSection
              title="Highlights positif"
              icon={CheckCircle2}
              tone="success"
              items={summary.highlights}
            />
          )}

          {summary.areas_to_push.length > 0 && (
            <SubSection
              title="Perlu didorong"
              icon={AlertCircle}
              tone="warning"
              items={summary.areas_to_push}
            />
          )}

          {summary.quick_wins.length > 0 && (
            <SubSection
              title="Quick wins"
              icon={Lightbulb}
              tone="info"
              items={summary.quick_wins}
            />
          )}
        </div>
      )}
    </section>
  );
}

function SubSection({
  title,
  icon: Icon,
  tone,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "success" | "warning" | "info";
  items: string[];
}) {
  const tones = {
    success: "border-atr-arti/30 bg-atr-arti/10 text-atr-arti",
    warning: "border-atr-yellow/40 bg-atr-yellow/15 text-atr-fg",
    info: "border-atr-purple/30 bg-white text-atr-purple-600",
  } as const;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-atr-fg-muted">
        <Icon className="h-3 w-3" />
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li
            key={i}
            className={`rounded-lg border px-3 py-2 text-xs ${tones[tone]}`}
          >
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
