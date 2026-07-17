export const metadata = { title: "Pembahasan Kuis" };

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { getMyQuizAttemptReview } from "@/server/queries/quiz-peserta";

export default async function PesertaKuisReviewPage({
  params,
}: {
  params: { attemptId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const review = await getMyQuizAttemptReview(params.attemptId, user.id);
  if (!review) notFound(); // not owned, or not a post-test (no review)

  return (
    <div className="space-y-5">
      <Link
        href="/peserta/kuis"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Hasil Kuis
      </Link>

      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-atr-fg">
          {review.quiz_title}
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-atr-fg-muted">
            Nilai: <strong className="text-atr-fg">{review.percent ?? "-"}</strong>
          </span>
          {review.passed != null && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                review.passed
                  ? "bg-atr-arti/15 text-atr-arti"
                  : "bg-atr-red/10 text-atr-red"
              }`}
            >
              {review.passed ? "Lulus" : "Belum Lulus"}
            </span>
          )}
        </div>
      </header>

      <div className="rounded-lg border border-atr-purple/30 bg-atr-purple-50/40 px-3.5 py-2.5 text-xs text-atr-fg">
        📘 Ini pembahasan post-test. Jawaban benar ditandai hijau agar Anda bisa
        belajar dari kesalahan.
      </div>

      <ul className="space-y-3">
        {review.questions.map((q, idx) => (
          <li
            key={idx}
            className="rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1"
          >
            <div className="flex items-start gap-2 text-sm font-bold text-atr-fg">
              {q.is_correct ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-atr-arti" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-atr-red" />
              )}
              <span>
                {idx + 1}. {q.prompt}
              </span>
            </div>
            <ul className="mt-2 space-y-1 pl-6 text-xs">
              {q.options.map((o, j) => (
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
  );
}
