"use client";

import { useState, useTransition } from "react";
import {
  Target,
  RefreshCw,
  Loader2,
  Award,
  AlertCircle,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import { regenerateDesaSwot } from "@/server/actions/ai";
import type { DesaSwot } from "@/lib/ai/desa-swot";

export function SwotCard({
  projectDesaId,
  initialSwot,
  initialError,
  cached,
}: {
  projectDesaId: string;
  initialSwot: DesaSwot | null;
  initialError: string | null;
  cached: boolean;
}) {
  const [swot, setSwot] = useState<DesaSwot | null>(initialSwot);
  const [error, setError] = useState<string | null>(initialError);
  const [isCached, setIsCached] = useState(cached);
  const [pending, startTransition] = useTransition();

  function regenerate() {
    startTransition(async () => {
      const r = await regenerateDesaSwot(projectDesaId);
      if (r.error) {
        setError(r.error);
      } else if (r.data) {
        setSwot(r.data);
        setError(null);
        setIsCached(r.cached ?? false);
      }
    });
  }

  return (
    <section className="space-y-3">
      <header className="flex items-start justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          <Target className="h-4 w-4 text-atr-purple" />
          SWOT Analysis Desa
          {isCached && swot && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
              · cached
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={regenerate}
          disabled={pending}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-outline bg-white px-2.5 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {swot ? "Regenerate" : "Generate"}
        </button>
      </header>

      {error && (
        <p className="rounded-lg border border-atr-red/30 bg-atr-red/10 p-3 text-xs text-atr-red">
          {error}
        </p>
      )}

      {!swot && !error && !pending && (
        <p className="rounded-2xl border border-dashed border-atr-outline bg-atr-bg-soft p-6 text-center text-sm italic text-atr-fg-muted">
          Klik &quot;Generate&quot; untuk analisis SWOT dari hasil pendampingan
          narasumber, rencana aksi, dan baseline desa.
        </p>
      )}

      {pending && !swot && (
        <p className="rounded-2xl border border-dashed border-atr-outline bg-atr-bg-soft p-6 text-center text-sm italic text-atr-fg-muted">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-atr-purple" />
          Menganalisis sesi pendampingan, rencana aksi, dan baseline…
        </p>
      )}

      {swot && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Quad
            title="Strengths"
            icon={Award}
            palette="green"
            items={swot.strengths}
          />
          <Quad
            title="Weaknesses"
            icon={AlertCircle}
            palette="red"
            items={swot.weaknesses}
          />
          <Quad
            title="Opportunities"
            icon={Lightbulb}
            palette="yellow"
            items={swot.opportunities}
          />
          <Quad
            title="Threats"
            icon={TrendingUp}
            palette="purple"
            items={swot.threats}
          />
        </div>
      )}
    </section>
  );
}

function Quad({
  title,
  icon: Icon,
  palette,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  palette: "green" | "red" | "yellow" | "purple";
  items: string[];
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
        <p className="text-xs italic opacity-70">-</p>
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
