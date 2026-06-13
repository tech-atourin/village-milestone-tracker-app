"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { submitCriteriaItem } from "@/server/actions/self-assessment";
import type { CriteriaItemRow, Tier } from "@/server/queries/self-assessment";

const TIER_LABEL: Record<Tier, string> = {
  rintisan: "Rintisan",
  berkembang: "Berkembang",
  maju: "Maju",
  mandiri: "Mandiri",
};

const TIER_COLOR: Record<Tier, string> = {
  rintisan: "bg-atr-yellow/15 text-atr-fg",
  berkembang: "bg-atr-arti/15 text-atr-arti",
  maju: "bg-atr-purple-50 text-atr-purple-600",
  mandiri: "bg-atr-purple-light/60 text-atr-purple-800",
};

const STATUS_STYLE = {
  not_started: { icon: Circle, color: "text-atr-fg-muted", label: "Belum" },
  submitted: { icon: Clock, color: "text-atr-yellow", label: "Menunggu verifikasi" },
  verified: { icon: CheckCircle2, color: "text-atr-arti", label: "Terverifikasi" },
  rejected: { icon: AlertCircle, color: "text-atr-red", label: "Perlu revisi" },
} as const;

export function SelfAssessmentList({
  desaId,
  items,
}: {
  desaId: string;
  items: CriteriaItemRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeTier, setActiveTier] = useState<Tier>(() => {
    // Default to first tier with unfinished required items
    const tiers: Tier[] = ["rintisan", "berkembang", "maju", "mandiri"];
    for (const t of tiers) {
      const tierItems = items.filter((i) => i.tier === t);
      const allRequiredDone =
        tierItems
          .filter((i) => i.required)
          .every((i) => i.status === "verified");
      if (!allRequiredDone) return t;
    }
    return "rintisan";
  });

  function submit(itemId: string) {
    startTransition(async () => {
      const r = await submitCriteriaItem({
        desa_id: desaId,
        criteria_item_id: itemId,
      });
      if (r.error) alert(r.error);
      else router.refresh();
    });
  }

  // Tier counts
  const tierStats: Record<Tier, { total: number; verified: number; submitted: number }> = {
    rintisan: { total: 0, verified: 0, submitted: 0 },
    berkembang: { total: 0, verified: 0, submitted: 0 },
    maju: { total: 0, verified: 0, submitted: 0 },
    mandiri: { total: 0, verified: 0, submitted: 0 },
  };
  for (const item of items) {
    tierStats[item.tier].total++;
    if (item.status === "verified") tierStats[item.tier].verified++;
    if (item.status === "submitted") tierStats[item.tier].submitted++;
  }

  const activeItems = items.filter((i) => i.tier === activeTier);
  const grouped = new Map<string, CriteriaItemRow[]>();
  for (const it of activeItems) {
    const arr = grouped.get(it.category) ?? [];
    arr.push(it);
    grouped.set(it.category, arr);
  }

  return (
    <div className="space-y-5">
      {/* Tier tabs */}
      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["rintisan", "berkembang", "maju", "mandiri"] as Tier[]).map((tier) => {
          const stats = tierStats[tier];
          const isActive = activeTier === tier;
          const pct = stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0;
          return (
            <button
              key={tier}
              type="button"
              onClick={() => setActiveTier(tier)}
              className={`rounded-2xl border-2 p-3 text-left transition ${
                isActive
                  ? "border-atr-purple bg-atr-purple-50"
                  : "border-atr-outline bg-white hover:bg-atr-bg-soft"
              }`}
            >
              <div
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${TIER_COLOR[tier]}`}
              >
                {TIER_LABEL[tier]}
              </div>
              <div className="mt-2 text-2xl font-bold text-atr-fg">
                {pct}%
              </div>
              <div className="text-[11px] text-atr-fg-muted">
                {stats.verified} / {stats.total} terverifikasi
              </div>
            </button>
          );
        })}
      </nav>

      {/* Items grouped by category */}
      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([category, catItems]) => (
          <section
            key={category}
            className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1"
          >
            <header className="border-b border-atr-outline bg-atr-bg-soft px-5 py-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-atr-purple">
                {category}
              </h3>
            </header>
            <ul className="divide-y divide-atr-outline">
              {catItems.map((it) => {
                const cfg = STATUS_STYLE[it.status];
                const Icon = cfg.icon;
                const canSubmit =
                  it.status === "not_started" || it.status === "rejected";
                return (
                  <li key={it.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <Icon
                        className={`mt-0.5 h-5 w-5 shrink-0 ${cfg.color}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-atr-fg">
                          {it.title}
                          {it.required && (
                            <span className="ml-1 text-xs text-atr-red">*</span>
                          )}
                        </div>
                        {it.description && (
                          <p className="mt-1 text-xs text-atr-fg-muted">
                            {it.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`inline-flex rounded-full bg-atr-bg-soft px-2 py-0.5 font-bold ${cfg.color}`}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-atr-fg-muted">
                            Bobot: {it.weight}
                          </span>
                        </div>
                      </div>
                      {canSubmit && (
                        <button
                          type="button"
                          onClick={() => submit(it.id)}
                          disabled={pending}
                          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-atr-purple px-2.5 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
                        >
                          {pending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          {it.status === "rejected" ? "Submit ulang" : "Tandai dipenuhi"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
