"use client";

import { useState, useTransition } from "react";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import {
  updateQuizMeta,
  upsertQuestion,
  deleteQuestion,
  reorderQuestions,
} from "@/server/actions/quizzes";
import { getQuizFullClient } from "./quiz-editor-data";
import type {
  QuizFull,
  QuizQuestionFull,
  QuizQuestionType,
} from "@/server/queries/quizzes";

type TopikOption = { id: string; name: string };

export function QuizEditor({
  quiz: initial,
  topikOptions,
  onClose,
}: {
  quiz: QuizFull;
  topikOptions: TopikOption[];
  onClose: () => void;
}) {
  const [quiz, setQuiz] = useState<QuizFull>(initial);
  const [editingQ, setEditingQ] = useState<QuizQuestionFull | "new" | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // ---- meta form state ----
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [kind, setKind] = useState(initial.kind);
  const [topikId, setTopikId] = useState(initial.topik_id ?? "");
  const [timerMin, setTimerMin] = useState(
    initial.time_limit_seconds ? Math.round(initial.time_limit_seconds / 60) : 0,
  );
  const [passing, setPassing] = useState(initial.passing_score ?? 0);
  const [maxAttempts, setMaxAttempts] = useState(initial.max_attempts);
  const [shuffle, setShuffle] = useState(initial.shuffle_questions);

  async function reload() {
    const full = await getQuizFullClient(quiz.id);
    if (full) setQuiz(full);
  }

  function saveMeta() {
    setError(null);
    if (kind !== "standalone" && !topikId) {
      setError("Pre-test / post-test wajib pilih materi (untuk masuk rapor peserta)");
      return;
    }
    startTransition(async () => {
      const r = await updateQuizMeta({
        quiz_id: quiz.id,
        title,
        description: description || null,
        kind,
        topik_id: topikId || null,
        time_limit_seconds: timerMin > 0 ? timerMin * 60 : null,
        passing_score: passing > 0 ? passing : null,
        max_attempts: maxAttempts,
        shuffle_questions: shuffle,
      });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    });
  }

  function removeQuestion(id: string) {
    if (!confirm("Hapus soal ini?")) return;
    startTransition(async () => {
      const r = await deleteQuestion(id);
      if ("error" in r) setError(r.error);
      else await reload();
    });
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...quiz.questions];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setQuiz({ ...quiz, questions: next });
    startTransition(async () => {
      await reorderQuestions({
        quiz_id: quiz.id,
        ordered_ids: next.map((q) => q.id),
      });
    });
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar kuis
      </button>

      {error && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-3.5 py-2.5 text-xs text-atr-red">
          {error}
        </div>
      )}

      {/* ---- Pengaturan ---- */}
      <section className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
        <h3 className="mb-3 text-sm font-bold text-atr-fg">Pengaturan Kuis</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Judul" className="sm:col-span-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-atr-outline px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Deskripsi / instruksi" className="sm:col-span-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-atr-outline px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Jenis">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as QuizFull["kind"])}
              className="w-full rounded-lg border border-atr-outline px-3 py-2 text-sm"
            >
              <option value="standalone">Mandiri</option>
              <option value="pre_test">Pre-test</option>
              <option value="post_test">Post-test</option>
            </select>
            <span className="mt-1 block text-[11px] text-atr-fg-muted">
              {kind === "post_test"
                ? "Post-test: peserta lihat skor + pembahasan (kunci jawaban) untuk belajar."
                : kind === "pre_test"
                  ? "Pre-test: peserta hanya lihat skor + lulus/tidak (kunci disembunyikan)."
                  : "Mandiri: peserta hanya lihat skor. Tidak masuk rapor pre/post."}
            </span>
          </Field>
          <Field label="Materi (untuk rapor)">
            <select
              value={topikId}
              onChange={(e) => setTopikId(e.target.value)}
              className="w-full rounded-lg border border-atr-outline px-3 py-2 text-sm"
            >
              <option value="">- tidak terkait materi -</option>
              {topikOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Batas waktu (menit, 0 = tanpa batas)">
            <input
              type="number"
              min={0}
              value={timerMin}
              onChange={(e) => setTimerMin(Number(e.target.value))}
              className="w-full rounded-lg border border-atr-outline px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Nilai lulus (KKM, 0 = tanpa)">
            <input
              type="number"
              min={0}
              max={100}
              value={passing}
              onChange={(e) => setPassing(Number(e.target.value))}
              className="w-full rounded-lg border border-atr-outline px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Maks. percobaan per email (0 = tak terbatas)">
            <input
              type="number"
              min={0}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              className="w-full rounded-lg border border-atr-outline px-3 py-2 text-sm"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-atr-fg">
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(e) => setShuffle(e.target.checked)}
              className="h-4 w-4"
            />
            Acak urutan soal
          </label>
        </div>
        <button
          type="button"
          onClick={saveMeta}
          disabled={pending}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : savedFlash ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {savedFlash ? "Tersimpan" : "Simpan Pengaturan"}
        </button>
      </section>

      {/* ---- Soal ---- */}
      <section className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-atr-fg">
            Soal ({quiz.questions.length})
          </h3>
          {editingQ === null && (
            <button
              type="button"
              onClick={() => setEditingQ("new")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-purple/40 bg-atr-purple-50 px-3 text-xs font-bold text-atr-purple-700 transition hover:bg-atr-purple-light/40"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Soal
            </button>
          )}
        </div>

        {editingQ !== null && (
          <QuestionForm
            quizId={quiz.id}
            initial={editingQ === "new" ? null : editingQ}
            onCancel={() => setEditingQ(null)}
            onSaved={async () => {
              setEditingQ(null);
              await reload();
            }}
          />
        )}

        {quiz.questions.length === 0 && editingQ === null ? (
          <p className="text-sm text-atr-fg-muted">
            Belum ada soal. Klik &quot;Tambah Soal&quot;.
          </p>
        ) : (
          <ul className="space-y-2">
            {quiz.questions.map((q, idx) => (
              <li
                key={q.id}
                className="rounded-xl border border-atr-outline bg-atr-bg-soft/40 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-atr-fg">
                      {idx + 1}. {q.prompt}
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {q.options.map((o) => (
                        <li
                          key={o.id}
                          className={`flex items-center gap-1.5 text-xs ${
                            o.is_correct
                              ? "font-bold text-atr-arti"
                              : "text-atr-fg-muted"
                          }`}
                        >
                          {o.is_correct ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <span className="inline-block h-3 w-3" />
                          )}
                          {o.label}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-atr-fg-muted">
                      {q.question_type === "true_false"
                        ? "Benar/Salah"
                        : "Pilihan ganda"}{" "}
                      · {q.points} poin
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0 || pending}
                      className="rounded-md p-1 text-atr-fg-muted hover:bg-white disabled:opacity-30"
                      aria-label="Naik"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(idx, 1)}
                      disabled={idx === quiz.questions.length - 1 || pending}
                      className="rounded-md p-1 text-atr-fg-muted hover:bg-white disabled:opacity-30"
                      aria-label="Turun"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingQ(q)}
                      className="rounded-md p-1 text-atr-fg-muted hover:bg-white"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      className="rounded-md p-1 text-atr-fg-muted hover:bg-white hover:text-atr-red"
                      aria-label="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// =====================================================
// Question form (add / edit)
// =====================================================
function QuestionForm({
  quizId,
  initial,
  onCancel,
  onSaved,
}: {
  quizId: string;
  initial: QuizQuestionFull | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [type, setType] = useState<QuizQuestionType>(
    initial?.question_type ?? "single_choice",
  );
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [options, setOptions] = useState<
    { label: string; is_correct: boolean }[]
  >(
    initial?.options.map((o) => ({ label: o.label, is_correct: o.is_correct })) ??
      [
        { label: "", is_correct: true },
        { label: "", is_correct: false },
      ],
  );

  function switchType(t: QuizQuestionType) {
    setType(t);
    if (t === "true_false") {
      setOptions([
        { label: "Benar", is_correct: true },
        { label: "Salah", is_correct: false },
      ]);
    }
  }

  function setCorrect(i: number) {
    // single_choice + true_false: exactly one correct
    setOptions((prev) => prev.map((o, j) => ({ ...o, is_correct: j === i })));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await upsertQuestion({
        quiz_id: quizId,
        question_id: initial?.id ?? null,
        prompt,
        question_type: type,
        points,
        options,
      });
      if ("error" in r) setError(r.error);
      else onSaved();
    });
  }

  return (
    <div className="mb-4 rounded-xl border border-atr-purple/30 bg-atr-purple-50/30 p-4">
      {error && (
        <div className="mb-2 rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
          {error}
        </div>
      )}
      <div className="space-y-3">
        <Field label="Pertanyaan">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-atr-outline px-3 py-2 text-sm"
          />
        </Field>
        <div className="flex flex-wrap gap-3">
          <Field label="Tipe">
            <select
              value={type}
              onChange={(e) => switchType(e.target.value as QuizQuestionType)}
              className="rounded-lg border border-atr-outline px-3 py-2 text-sm"
            >
              <option value="single_choice">Pilihan ganda</option>
              <option value="true_false">Benar/Salah</option>
            </select>
          </Field>
          <Field label="Poin">
            <input
              type="number"
              min={0}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-24 rounded-lg border border-atr-outline px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            Opsi jawaban (klik lingkaran untuk tandai benar)
          </div>
          <ul className="space-y-2">
            {options.map((o, i) => (
              <li key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCorrect(i)}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    o.is_correct
                      ? "border-atr-arti bg-atr-arti text-white"
                      : "border-atr-outline"
                  }`}
                  aria-label="Tandai benar"
                >
                  {o.is_correct && <Check className="h-3 w-3" />}
                </button>
                <input
                  value={o.label}
                  disabled={type === "true_false"}
                  onChange={(e) =>
                    setOptions((prev) =>
                      prev.map((x, j) =>
                        j === i ? { ...x, label: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder={`Opsi ${i + 1}`}
                  className="flex-1 rounded-lg border border-atr-outline px-3 py-1.5 text-sm disabled:bg-atr-bg-soft"
                />
                {type === "single_choice" && options.length > 2 && (
                  <button
                    type="button"
                    onClick={() =>
                      setOptions((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="rounded-md p-1 text-atr-fg-muted hover:text-atr-red"
                    aria-label="Hapus opsi"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {type === "single_choice" && options.length < 8 && (
            <button
              type="button"
              onClick={() =>
                setOptions((prev) => [...prev, { label: "", is_correct: false }])
              }
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-atr-purple-600 hover:text-atr-purple"
            >
              <Plus className="h-3 w-3" /> Tambah opsi
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-4 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Simpan Soal
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-lg border border-atr-outline bg-white px-4 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
