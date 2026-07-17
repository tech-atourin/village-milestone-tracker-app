"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  ListChecks,
  Loader2,
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import type { PublicQuiz, PublicQuizQuestion } from "@/server/queries/quiz-public";

type Phase = "intro" | "taking" | "result";
type ReviewItem = {
  prompt: string;
  is_correct: boolean;
  options: { label: string; is_correct: boolean; selected: boolean }[];
};
type Result = {
  score: number;
  max_score: number;
  percent: number;
  passed: boolean | null;
  review?: ReviewItem[];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    // Not cryptographic — display order only.
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function QuizTaker({
  quiz,
  slug,
  knownIdentity = null,
}: {
  quiz: PublicQuiz;
  slug: string;
  knownIdentity?: { name: string; email: string } | null;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [name, setName] = useState(knownIdentity?.name ?? "");
  const [email, setEmail] = useState(knownIdentity?.email ?? "");
  const [phone, setPhone] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const startedAtRef = useRef<string | null>(null);

  const questions = useMemo<PublicQuizQuestion[]>(
    () => (quiz.shuffle_questions ? shuffle(quiz.questions) : quiz.questions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quiz.id],
  );

  const doSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/kuis/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          respondent_name: name,
          respondent_email: email,
          respondent_phone: phone || null,
          started_at: startedAtRef.current,
          hp,
          answers: Object.entries(answers).map(([question_id, selected_option_ids]) => ({
            question_id,
            selected_option_ids,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Gagal mengirim jawaban");
        setSubmitting(false);
        return;
      }
      setResult({
        score: json.score,
        max_score: json.max_score,
        percent: json.percent,
        passed: json.passed,
        review: json.review,
      });
      setPhase("result");
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
      setSubmitting(false);
    }
  }, [slug, name, email, phone, hp, answers]);

  // Countdown timer.
  useEffect(() => {
    if (phase !== "taking" || remaining === null) return;
    if (remaining <= 0) {
      doSubmit();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [phase, remaining, doSubmit]);

  function start() {
    setError(null);
    if (name.trim().length < 2) {
      setError("Nama wajib diisi");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Email tidak valid");
      return;
    }
    startedAtRef.current = new Date().toISOString();
    if (quiz.time_limit_seconds) setRemaining(quiz.time_limit_seconds);
    setPhase("taking");
  }

  function pick(q: PublicQuizQuestion, optionId: string) {
    // single_choice / true_false → single selection
    setAnswers((prev) => ({ ...prev, [q.id]: [optionId] }));
  }

  const hasBranding =
    quiz.branding.org_logo_url ||
    quiz.branding.extra_logos.length > 0 ||
    quiz.branding.org_name;
  const LogoHeader = hasBranding ? (
    <div className="mb-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
      {quiz.branding.extra_logos.map((l) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={l.signed_url}
          src={l.signed_url}
          alt={l.label}
          title={l.label}
          className="h-10 w-auto object-contain"
        />
      ))}
      {quiz.branding.org_logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={quiz.branding.org_logo_url}
          alt={quiz.branding.org_name ?? "Mitra"}
          title={quiz.branding.org_name ?? undefined}
          className="h-10 w-auto object-contain"
        />
      ) : (
        quiz.branding.org_name &&
        quiz.branding.extra_logos.length === 0 && (
          <span className="text-sm font-bold text-atr-fg">
            {quiz.branding.org_name}
          </span>
        )
      )}
    </div>
  ) : null;

  // ---- Window closed / not yet open ----
  if (quiz.window !== "open") {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertCircle className="h-10 w-10 text-atr-yellow" />
          <h1 className="text-lg font-bold text-atr-fg">{quiz.title}</h1>
          <p className="text-sm text-atr-fg-muted">
            {quiz.window === "not_yet"
              ? "Kuis ini belum dibuka. Silakan kembali lagi nanti."
              : "Kuis ini sudah ditutup."}
          </p>
        </div>
      </Card>
    );
  }

  // ---- Result ----
  if (phase === "result" && result) {
    const isPass = result.passed;
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          {isPass === true ? (
            <CheckCircle2 className="h-14 w-14 text-atr-arti" />
          ) : isPass === false ? (
            <XCircle className="h-14 w-14 text-atr-red" />
          ) : (
            <Award className="h-14 w-14 text-atr-purple" />
          )}
          <h1 className="text-lg font-bold text-atr-fg">Terima kasih, {name}!</h1>
          <p className="text-sm text-atr-fg-muted">
            Jawaban Anda sudah terekam untuk kuis <strong>{quiz.title}</strong>.
          </p>
          <div className="mt-2 grid w-full grid-cols-2 gap-3">
            <Stat label="Skor" value={`${result.score}/${result.max_score}`} />
            <Stat label="Nilai" value={`${result.percent}`} highlight />
          </div>
          {isPass !== null && (
            <div
              className={`mt-2 rounded-full px-4 py-1.5 text-sm font-bold ${
                isPass
                  ? "bg-atr-arti/15 text-atr-arti"
                  : "bg-atr-red/10 text-atr-red"
              }`}
            >
              {isPass ? "LULUS" : "BELUM LULUS"}
            </div>
          )}
        </div>

        {result.review && result.review.length > 0 && (
          <div className="mt-5 border-t border-atr-outline pt-4 text-left">
            <h2 className="mb-3 text-sm font-bold text-atr-fg">
              Pembahasan Jawaban
            </h2>
            <ul className="space-y-3">
              {result.review.map((r, idx) => (
                <li
                  key={idx}
                  className="rounded-xl border border-atr-outline bg-atr-bg-soft/40 p-3"
                >
                  <div className="flex items-start gap-2 text-sm font-bold text-atr-fg">
                    {r.is_correct ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-atr-arti" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-atr-red" />
                    )}
                    <span>
                      {idx + 1}. {r.prompt}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 pl-6 text-xs">
                    {r.options.map((o, j) => (
                      <li
                        key={j}
                        className={`flex items-center gap-1.5 ${
                          o.is_correct
                            ? "font-bold text-atr-arti"
                            : o.selected
                              ? "text-atr-red line-through"
                              : "text-atr-fg-muted"
                        }`}
                      >
                        {o.is_correct ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : o.selected ? (
                          <XCircle className="h-3 w-3" />
                        ) : (
                          <span className="inline-block h-3 w-3" />
                        )}
                        {o.label}
                        {o.selected && !o.is_correct && (
                          <span className="text-[10px]"> (jawaban Anda)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    );
  }

  // ---- Intro ----
  if (phase === "intro") {
    return (
      <>
        {LogoHeader}
        <Card>
        <h1 className="text-xl font-bold text-atr-fg">{quiz.title}</h1>
        {quiz.description && (
          <p className="mt-1 text-sm text-atr-fg-muted">{quiz.description}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-atr-fg-muted">
          <span className="inline-flex items-center gap-1">
            <ListChecks className="h-3.5 w-3.5" /> {quiz.question_count} soal
          </span>
          {quiz.time_limit_seconds ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {Math.round(quiz.time_limit_seconds / 60)} menit
            </span>
          ) : null}
          {quiz.passing_score != null && (
            <span className="inline-flex items-center gap-1">
              <Award className="h-3.5 w-3.5" /> Nilai lulus {quiz.passing_score}
            </span>
          )}
        </div>

        {knownIdentity && (
          <div className="mt-4 rounded-lg border border-atr-arti/30 bg-atr-arti/10 px-3.5 py-2.5 text-xs text-atr-fg">
            ✓ Anda mengerjakan sebagai <strong>{knownIdentity.name}</strong>.
            Hasil langsung tersimpan ke akun Anda.
          </div>
        )}

        <div className="mt-5 space-y-3">
          <TextField
            label="Nama lengkap"
            value={name}
            onChange={setName}
            required
            readOnly={!!knownIdentity}
          />
          <TextField
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            required
            readOnly={!!knownIdentity}
            hint={
              knownIdentity
                ? undefined
                : "Digunakan untuk mencocokkan hasil dengan data peserta."
            }
          />
          <TextField
            label="No. HP (opsional)"
            value={phone}
            onChange={setPhone}
          />
          {/* Honeypot — visually hidden, ignored by humans */}
          <input
            type="text"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />
        </div>

        {error && (
          <p className="mt-3 text-xs font-bold text-atr-red">{error}</p>
        )}

        <button
          type="button"
          onClick={start}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-atr-purple text-sm font-bold text-white transition hover:bg-atr-purple-600"
        >
          Mulai Kerjakan
        </button>
        {quiz.time_limit_seconds ? (
          <p className="mt-2 text-center text-[11px] text-atr-fg-muted">
            Timer mulai berjalan begitu Anda menekan &quot;Mulai&quot;.
          </p>
        ) : null}
        </Card>
      </>
    );
  }

  // ---- Taking ----
  const answeredCount = Object.values(answers).filter((v) => v.length > 0).length;
  return (
    <div className="space-y-4">
      {/* Sticky header: progress + timer */}
      <div className="sticky top-0 z-10 rounded-2xl border border-atr-outline bg-white/95 p-3 shadow-atr-1 backdrop-blur">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-atr-fg">
            {answeredCount}/{quiz.question_count} terjawab
          </span>
          {remaining !== null && (
            <span
              className={`inline-flex items-center gap-1 font-bold ${
                remaining <= 30 ? "text-atr-red" : "text-atr-fg"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {fmtClock(remaining)}
            </span>
          )}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-atr-bg-soft">
          <div
            className="h-full bg-atr-purple transition-all"
            style={{
              width: `${(answeredCount / Math.max(quiz.question_count, 1)) * 100}%`,
            }}
          />
        </div>
      </div>

      {questions.map((q, idx) => (
        <Card key={q.id}>
          <div className="text-sm font-bold text-atr-fg">
            {idx + 1}. {q.prompt}
          </div>
          <ul className="mt-3 space-y-2">
            {q.options.map((o) => {
              const selected = (answers[q.id] ?? []).includes(o.id);
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => pick(q, o.id)}
                    className={`flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                      selected
                        ? "border-atr-purple bg-atr-purple-50 font-bold text-atr-purple-700"
                        : "border-atr-outline bg-white text-atr-fg hover:bg-atr-bg-soft"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected
                          ? "border-atr-purple bg-atr-purple"
                          : "border-atr-outline"
                      }`}
                    >
                      {selected && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    {o.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}

      {error && <p className="text-center text-xs font-bold text-atr-red">{error}</p>}

      <button
        type="button"
        onClick={() => {
          if (
            answeredCount < quiz.question_count &&
            !confirm(
              `Masih ada ${quiz.question_count - answeredCount} soal belum dijawab. Kirim sekarang?`,
            )
          )
            return;
          doSubmit();
        }}
        disabled={submitting}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-atr-purple text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Mengirim...
          </>
        ) : (
          "Kirim Jawaban"
        )}
      </button>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-atr-outline bg-atr-bg-soft/40 p-3 text-center">
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div
        className={`mt-0.5 text-xl font-bold ${
          highlight ? "text-atr-purple-700" : "text-atr-fg"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required,
  hint,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-atr-fg">
        {label} {required && <span className="text-atr-red">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className={`w-full rounded-lg border border-atr-outline px-3 py-2 text-sm ${readOnly ? "bg-atr-bg-soft text-atr-fg-muted" : ""}`}
      />
      {hint && <span className="mt-1 block text-[11px] text-atr-fg-muted">{hint}</span>}
    </label>
  );
}
