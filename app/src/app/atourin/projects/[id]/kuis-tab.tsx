"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Link2,
  Check,
  Copy,
  Clock,
  ListChecks,
  Users,
  GraduationCap,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  createQuiz,
  deleteQuiz,
  togglePublishQuiz,
} from "@/server/actions/quizzes";
import type { QuizListRow } from "@/server/queries/quizzes";
import type { QuizFull } from "@/server/queries/quizzes";
import { getQuizFullClient } from "./quiz-editor-data";
import { QuizEditor } from "./quiz-editor";

type TopikOption = { id: string; name: string };

const KIND_LABEL: Record<string, string> = {
  pre_test: "Pre-test",
  post_test: "Post-test",
  standalone: "Mandiri",
};

export function KuisTab({
  projectId,
  quizzes,
  topikOptions,
  scope,
}: {
  projectId: string;
  quizzes: QuizListRow[];
  topikOptions: TopikOption[];
  scope: "atourin" | "mitra";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<QuizFull | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function create() {
    setError(null);
    const title = prompt("Judul kuis baru:");
    if (!title || title.trim().length < 2) return;
    startTransition(async () => {
      const r = await createQuiz({ project_id: projectId, title: title.trim() });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      // Open the editor immediately for the fresh quiz.
      const full = await getQuizFullClient(r.id);
      if (full) setEditing(full);
      router.refresh();
    });
  }

  async function openEditor(quizId: string) {
    setError(null);
    setLoadingEditId(quizId);
    try {
      const full = await getQuizFullClient(quizId);
      if (full) setEditing(full);
      else setError("Gagal memuat kuis");
    } finally {
      setLoadingEditId(null);
    }
  }

  function remove(quizId: string) {
    if (!confirm("Hapus kuis ini beserta semua soal & hasilnya?")) return;
    setBusyId(quizId);
    startTransition(async () => {
      try {
        const r = await deleteQuiz(quizId);
        if ("error" in r) setError(r.error);
        else router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  function togglePublish(q: QuizListRow) {
    setBusyId(q.id);
    startTransition(async () => {
      try {
        const r = await togglePublishQuiz(q.id, !q.is_published);
        if ("error" in r) setError(r.error);
        else router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  function copyLink(q: QuizListRow) {
    if (!q.public_slug) return;
    const url = `${window.location.origin}/public/kuis/${q.public_slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(q.id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  }

  if (editing) {
    return (
      <QuizEditor
        quiz={editing}
        topikOptions={topikOptions}
        onClose={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-atr-fg">Kuis / Tes</h3>
          <p className="text-sm text-atr-fg-muted">
            Buat kuis pilihan ganda yang bisa diisi peserta lewat link publik
            (tanpa login). Hasil otomatis terekap di tab ini.
          </p>
        </div>
        <button
          type="button"
          onClick={create}
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Buat Kuis
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-3.5 py-2.5 text-xs text-atr-red">
          {error}
        </div>
      )}

      {quizzes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-atr-bg-soft/40 p-10 text-center">
          <ListChecks className="mx-auto h-8 w-8 text-atr-fg-muted" />
          <p className="mt-2 text-sm font-bold text-atr-fg">Belum ada kuis</p>
          <p className="text-xs text-atr-fg-muted">
            Klik &quot;Buat Kuis&quot; untuk mulai menyusun pertanyaan.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {quizzes.map((q) => (
            <li
              key={q.id}
              className="flex flex-col rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold text-atr-fg">
                      {q.title}
                    </span>
                    <span className="inline-flex rounded-full border border-atr-purple/30 bg-atr-purple-50/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-atr-purple-700">
                      {KIND_LABEL[q.kind]}
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                        q.is_published
                          ? "border-atr-arti/30 bg-atr-arti/15 text-atr-arti"
                          : "border-atr-outline bg-atr-bg-soft text-atr-fg-muted"
                      }`}
                    >
                      {q.is_published ? (
                        <Eye className="h-2.5 w-2.5" />
                      ) : (
                        <EyeOff className="h-2.5 w-2.5" />
                      )}
                      {q.is_published ? "Publish" : "Draft"}
                    </span>
                  </div>
                  {q.topik_name && (
                    <div className="mt-0.5 text-[11px] text-atr-fg-muted">
                      Materi: {q.topik_name}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-atr-fg-muted">
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="h-3 w-3" /> {q.question_count} soal
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> {q.attempt_count} responden
                </span>
                {q.time_limit_seconds ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.round(q.time_limit_seconds / 60)} menit
                  </span>
                ) : null}
                {q.passing_score != null && (
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" /> KKM {q.passing_score}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-atr-outline pt-3">
                <button
                  type="button"
                  onClick={() => openEditor(q.id)}
                  disabled={loadingEditId === q.id}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-outline bg-white px-2.5 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft disabled:opacity-50"
                >
                  {loadingEditId === q.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Pencil className="h-3 w-3" />
                  )}
                  Kelola
                </button>
                <a
                  href={`/${scope}/projects/${projectId}/kuis/${q.id}/hasil`}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-outline bg-white px-2.5 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
                >
                  <Users className="h-3 w-3" />
                  Hasil
                </a>
                <button
                  type="button"
                  onClick={() => togglePublish(q)}
                  disabled={busyId === q.id}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-outline bg-white px-2.5 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft disabled:opacity-50"
                >
                  {busyId === q.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : q.is_published ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                  {q.is_published ? "Unpublish" : "Publish"}
                </button>
                {q.is_published && q.public_slug && (
                  <button
                    type="button"
                    onClick={() => copyLink(q)}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-purple/40 bg-atr-purple-50 px-2.5 text-xs font-bold text-atr-purple-700 transition hover:bg-atr-purple-light/40"
                  >
                    {copiedId === q.id ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Link2 className="h-3 w-3" />
                    )}
                    {copiedId === q.id ? "Tersalin" : "Salin Link"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(q.id)}
                  disabled={busyId === q.id}
                  className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-atr-outline bg-white text-atr-fg-muted transition hover:border-atr-red/30 hover:text-atr-red disabled:opacity-50"
                  aria-label="Hapus kuis"
                >
                  {busyId === q.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
