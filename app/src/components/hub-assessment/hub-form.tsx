"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Save,
  Send,
  Award,
} from "lucide-react";
import { saveHubAssessment } from "@/server/actions/hub-assessment";
import type {
  HubAssessmentTemplate,
  HubAssessmentResponse,
  HubAssessmentPillar,
  HubAssessmentQuestion,
} from "@/server/queries/hub-assessment";
import { CommentThread } from "@/components/assessment/comment-thread";
import type { AssessmentComment } from "@/server/queries/assessment-comments";

const TIER_COLOR: Record<string, string> = {
  Rintisan: "bg-atr-yellow/20 text-atr-fg border-atr-yellow/40",
  Berkembang: "bg-atr-arti/15 text-atr-arti border-atr-arti/30",
  Maju: "bg-atr-purple-50 text-atr-purple-600 border-atr-purple/30",
  Mandiri: "bg-atr-purple-light/60 text-atr-purple-800 border-atr-purple/50",
};

export function HubAssessmentForm({
  desaId,
  template,
  existing,
  commentsByQuestion,
  currentUserId,
  currentUserRole,
  forceReadOnly = false,
}: {
  desaId: string;
  template: HubAssessmentTemplate;
  existing: HubAssessmentResponse | null;
  commentsByQuestion?: Map<string, AssessmentComment[]>;
  currentUserId?: string;
  currentUserRole?: string;
  /**
   * When true, disable all inputs and hide Save/Submit regardless of status.
   * Used by admin/mitra read-only viewer at /atourin/klasifikasi/v2/[id].
   */
  forceReadOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activePillar, setActivePillar] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>(
    (existing?.jawaban as Record<string, unknown>) ?? {},
  );
  const [savedSummary, setSavedSummary] = useState<{
    skor_total: number;
    level_hasil: string;
  } | null>(
    existing && existing.skor_total != null && existing.level_hasil
      ? { skor_total: existing.skor_total, level_hasil: existing.level_hasil }
      : null,
  );

  const isReadOnly = forceReadOnly || existing?.status === "verified";

  function setAns(qid: string, v: unknown) {
    setAnswers((a) => ({ ...a, [qid]: v }));
  }

  function toggleMulti(qid: string, option: string) {
    const cur = (answers[qid] as string[] | undefined) ?? [];
    const next = cur.includes(option)
      ? cur.filter((c) => c !== option)
      : [...cur, option];
    setAns(qid, next);
  }

  function save(submit = false) {
    setError(null);
    startTransition(async () => {
      const r = await saveHubAssessment({
        desa_id: desaId,
        template_id: template.id,
        jawaban: answers,
        submit,
      });
      if (r.error) setError(r.error);
      else {
        if (r.skor_total != null && r.level_hasil) {
          setSavedSummary({
            skor_total: r.skor_total,
            level_hasil: r.level_hasil,
          });
        }
        router.refresh();
      }
    });
  }

  // Per-pilar completeness
  const pillarStats = template.definisi.pillars.map((p) => {
    const total = p.questions.length;
    const filled = p.questions.filter((q) => {
      const a = answers[q.id];
      if (q.type === "multi")
        return Array.isArray(a) && (a as unknown[]).length > 0;
      if (q.type === "text")
        return typeof a === "string" && (a as string).trim().length >= 3;
      return a !== undefined && a !== null && a !== "";
    }).length;
    return { total, filled };
  });
  const overallTotal = pillarStats.reduce((a, b) => a + b.total, 0);
  const overallFilled = pillarStats.reduce((a, b) => a + b.filled, 0);

  const pilar = template.definisi.pillars[activePillar];

  return (
    <div className="space-y-5">
      {/* Header status */}
      <header className="flex flex-col gap-3 rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            Progress pengisian
          </div>
          <div className="mt-1 text-2xl font-bold text-atr-fg">
            {overallFilled} / {overallTotal} pertanyaan
          </div>
          <div className="mt-1.5 h-2 w-48 overflow-hidden rounded-full bg-atr-bg-soft">
            <div
              className="h-full bg-atr-purple transition-all"
              style={{
                width: `${overallTotal > 0 ? Math.round((overallFilled / overallTotal) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
        {savedSummary && (
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              Hasil saat ini
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-atr-fg">
                {savedSummary.skor_total}%
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                  TIER_COLOR[savedSummary.level_hasil] ?? ""
                }`}
              >
                <Award className="h-3 w-3" />
                {savedSummary.level_hasil}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Pillar tabs */}
      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {template.definisi.pillars.map((p, i) => {
          const stats = pillarStats[i];
          const isActive = i === activePillar;
          const complete = stats.filled === stats.total && stats.total > 0;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setActivePillar(i)}
              className={`rounded-xl border-2 p-3 text-left transition ${
                isActive
                  ? "border-atr-purple bg-atr-purple-50"
                  : "border-atr-outline bg-white hover:bg-atr-bg-soft"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-atr-fg-muted">
                <span>Pilar {i + 1}</span>
                {complete && <CheckCircle2 className="h-3 w-3 text-atr-arti" />}
              </div>
              <div className="mt-1 text-xs font-bold leading-snug text-atr-fg">
                {p.title}
              </div>
              <div className="mt-1.5 text-[11px] text-atr-fg-muted">
                {stats.filled}/{stats.total}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Active pillar questions */}
      <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-atr-fg">{pilar.title}</h3>
          {pilar.description && (
            <p className="mt-1 text-sm text-atr-fg-muted">{pilar.description}</p>
          )}
        </div>

        {pilar.questions.map((q) => (
          <div key={q.id} className="space-y-2">
            <QuestionItem
              q={q}
              value={answers[q.id]}
              isReadOnly={isReadOnly}
              onSingle={(v) => setAns(q.id, v)}
              onMulti={(opt) => toggleMulti(q.id, opt)}
              onSlider={(n) => setAns(q.id, n)}
              onText={(t) => setAns(q.id, t)}
            />
            {existing && commentsByQuestion && currentUserId && currentUserRole && (
              <CommentThread
                targetType="hub_question"
                targetId={`${existing.id}:${q.id}`}
                desaId={desaId}
                comments={commentsByQuestion.get(q.id) ?? []}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
              />
            )}
          </div>
        ))}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setActivePillar(Math.max(0, activePillar - 1))}
            disabled={activePillar === 0}
            className="inline-flex h-9 items-center rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft disabled:opacity-40"
          >
            ← Pilar sebelumnya
          </button>
          <button
            type="button"
            onClick={() =>
              setActivePillar(
                Math.min(
                  template.definisi.pillars.length - 1,
                  activePillar + 1,
                ),
              )
            }
            disabled={activePillar === template.definisi.pillars.length - 1}
            className="inline-flex h-9 items-center rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft disabled:opacity-40"
          >
            Pilar berikutnya →
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 p-3 text-sm text-atr-red">
          {error}
        </div>
      )}

      {/* Save actions */}
      {!isReadOnly && !forceReadOnly && (
        <div className="flex flex-col gap-2 rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-atr-fg-muted">
            Simpan draft kapan saja. Submit untuk verifikasi oleh tim Atourin.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={pending}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-4 text-sm font-bold text-atr-fg hover:bg-atr-bg-soft disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Simpan draft
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    "Submit untuk verifikasi? Setelah submit Anda masih bisa edit tapi status berubah ke 'submitted'.",
                  )
                )
                  save(true);
              }}
              disabled={pending}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit untuk verifikasi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionItem({
  q,
  value,
  isReadOnly,
  onSingle,
  onMulti,
  onSlider,
  onText,
}: {
  q: HubAssessmentQuestion;
  value: unknown;
  isReadOnly: boolean;
  onSingle: (v: string) => void;
  onMulti: (opt: string) => void;
  onSlider: (n: number) => void;
  onText: (t: string) => void;
}) {
  return (
    <div className="space-y-3 border-l-2 border-atr-purple/30 pl-4">
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm font-bold text-atr-fg">{q.label}</p>
        <span className="shrink-0 rounded-full bg-atr-bg-soft px-2 py-0.5 text-[10px] font-bold text-atr-fg-muted">
          bobot {q.weight}
        </span>
      </div>

      {q.type === "single" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options.map((opt) => {
            const checked = value === opt;
            return (
              <label
                key={opt}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition ${
                  checked
                    ? "border-atr-purple bg-atr-purple-50 text-atr-fg"
                    : "border-atr-outline bg-white text-atr-fg hover:bg-atr-bg-soft"
                } ${isReadOnly ? "pointer-events-none opacity-70" : ""}`}
              >
                <input
                  type="radio"
                  name={q.id}
                  checked={checked}
                  onChange={() => onSingle(opt)}
                  className="accent-atr-purple"
                  disabled={isReadOnly}
                />
                {opt}
              </label>
            );
          })}
        </div>
      )}

      {q.type === "multi" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options.map((opt) => {
            const arr = (value as string[] | undefined) ?? [];
            const checked = arr.includes(opt);
            return (
              <label
                key={opt}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition ${
                  checked
                    ? "border-atr-purple bg-atr-purple-50 text-atr-fg"
                    : "border-atr-outline bg-white text-atr-fg hover:bg-atr-bg-soft"
                } ${isReadOnly ? "pointer-events-none opacity-70" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onMulti(opt)}
                  className="accent-atr-purple"
                  disabled={isReadOnly}
                />
                {opt}
              </label>
            );
          })}
        </div>
      )}

      {q.type === "slider" && (
        <div className="rounded-lg border border-atr-outline bg-atr-bg-soft p-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-atr-fg-muted">
              {q.min}
            </span>
            <input
              type="range"
              min={q.min}
              max={q.max}
              step={1}
              value={
                typeof value === "number"
                  ? value
                  : Number(value) || Math.floor((q.min + q.max) / 2)
              }
              onChange={(e) => onSlider(Number(e.target.value))}
              disabled={isReadOnly}
              className="flex-1 accent-atr-purple"
            />
            <span className="text-xs font-bold text-atr-fg-muted">
              {q.max}
            </span>
            <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md bg-atr-purple-50 text-sm font-bold text-atr-purple-600">
              {value != null ? String(value) : "-"}
            </div>
          </div>
        </div>
      )}

      {q.type === "text" && (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onText(e.target.value)}
          disabled={isReadOnly}
          placeholder={q.placeholder ?? ""}
          className="h-11 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
        />
      )}
    </div>
  );
}
