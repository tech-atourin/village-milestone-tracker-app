import Link from "next/link";
import { TrendingUp, Award, ChevronRight, CheckCircle2 } from "lucide-react";
import type { TierJourney } from "@/server/queries/tier-journey";

const TIER_BADGE: Record<string, string> = {
  rintisan: "bg-atr-yellow/20 text-atr-fg",
  berkembang: "bg-atr-arti/15 text-atr-arti",
  maju: "bg-atr-purple-50 text-atr-purple-600",
  mandiri: "bg-atr-purple-light/60 text-atr-purple-800",
  unclassified: "bg-atr-bg-soft text-atr-fg-muted",
};

/**
 * Self-Improvement Journey card.
 * Tunjukkan: tier sekarang → tier berikutnya, progress bar, dan top-6
 * kriteria yang masih perlu di-approve untuk naik tier. Klik kriteria
 * → langsung ke halaman self-assessment V1 ADWI untuk dikerjakan.
 */
export function TierJourneyCard({
  journey,
  selfAssessmentHref = "/desa/self-assessment?v=v1",
  viewerScope = "desa",
}: {
  journey: TierJourney;
  selfAssessmentHref?: string;
  viewerScope?: "desa" | "atourin" | "mitra";
}) {
  if (!journey.next_tier) {
    return (
      <article className="rounded-2xl border border-atr-purple/30 bg-gradient-to-br from-atr-purple-50 to-white p-6 shadow-atr-1">
        <header className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-atr-purple-600">
          <Award className="h-4 w-4" />
          Self-Improvement Journey
        </header>
        <p className="text-sm font-bold text-atr-fg">
          🏆 Desa sudah di tier tertinggi (Mandiri)
        </p>
        <p className="mt-1 text-xs text-atr-fg-muted">
          Pertahankan kualitas dan dokumentasikan model agar bisa direplikasi
          oleh desa lain.
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-atr-purple/30 bg-gradient-to-br from-atr-purple-50/60 to-white p-6 shadow-atr-1">
      <header className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-atr-purple-600">
        <TrendingUp className="h-4 w-4" />
        Self-Improvement Journey
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
            TIER_BADGE[journey.current_tier]
          }`}
        >
          <Award className="h-3 w-3" />
          {journey.current_label}
        </span>
        <ChevronRight className="h-4 w-4 text-atr-fg-muted" />
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
            TIER_BADGE[journey.next_tier]
          }`}
        >
          <Award className="h-3 w-3" />
          {journey.next_label}
        </span>
        <span className="ml-auto text-xs text-atr-fg-muted">
          {journey.approved_count}/{journey.total_criteria_next} kriteria
          disetujui
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-atr-bg-soft">
        <div
          className="h-full bg-atr-purple transition-all"
          style={{ width: `${journey.progress_pct}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-atr-fg-muted">
        {journey.progress_pct}% siap menuju tier{" "}
        <strong className="text-atr-fg">{journey.next_label}</strong>.
        {journey.submitted_count > 0 && (
          <>
            {" "}
            <strong className="text-atr-yellow-600">
              {journey.submitted_count}
            </strong>{" "}
            menunggu review Atourin.
          </>
        )}
      </p>

      {journey.missing_criteria.length > 0 && (
        <>
          <h4 className="mt-5 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            Prioritas berikutnya
          </h4>
          <ul className="mt-2 space-y-2">
            {journey.missing_criteria.map((c) => (
              <li
                key={c.id}
                className="flex items-start gap-2 rounded-lg border border-atr-outline bg-white p-3 text-xs"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-atr-fg-muted/40" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-atr-fg">{c.title}</span>
                    <span className="inline-flex rounded-full bg-atr-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-atr-purple-600">
                      {c.category}
                    </span>
                  </div>
                  {c.description && (
                    <p className="mt-0.5 line-clamp-2 text-atr-fg-muted">
                      {c.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {viewerScope === "desa" && (
            <Link
              href={selfAssessmentHref}
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-xs font-bold text-white transition hover:bg-atr-purple-600"
            >
              Mulai kerjakan checklist
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </>
      )}
    </article>
  );
}
