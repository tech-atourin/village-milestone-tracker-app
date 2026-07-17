export const metadata = { title: "Hasil Kuis Saya" };

import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, ChevronRight, BookOpen } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { listMyQuizAttempts } from "@/server/queries/quiz-peserta";
import { EmptyState } from "@/components/ui/empty-state";

const KIND_LABEL: Record<string, string> = {
  pre_test: "Pre-test",
  post_test: "Post-test",
  standalone: "Kuis",
};

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function PesertaKuisPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const attempts = await listMyQuizAttempts(user.id);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-atr-fg">
          Hasil Kuis Saya
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Rekap kuis yang sudah Anda kerjakan. Pembahasan jawaban tersedia untuk
          post-test.
        </p>
      </header>

      {attempts.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada kuis dikerjakan"
          description="Kuis yang Anda isi lewat link akan muncul di sini setelah data Anda tercocokkan."
        />
      ) : (
        <ul className="space-y-3">
          {attempts.map((a) => (
            <li
              key={a.attempt_id}
              className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1"
            >
              <div className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-atr-purple-50 text-atr-purple">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-atr-fg">
                      {a.quiz_title}
                    </span>
                    <span className="inline-flex rounded-full border border-atr-purple/30 bg-atr-purple-50/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-atr-purple-700">
                      {KIND_LABEL[a.kind]}
                    </span>
                  </div>
                  {a.project_name && (
                    <div className="mt-0.5 text-[11px] text-atr-fg-muted">
                      {a.project_name} · {fmtDate(a.submitted_at)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-atr-outline bg-atr-bg-soft px-4 py-3">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
                      Nilai
                    </div>
                    <div className="text-lg font-bold text-atr-fg">
                      {a.percent ?? "-"}
                      <span className="text-xs font-normal text-atr-fg-muted">
                        {" "}
                        ({a.score}/{a.max_score})
                      </span>
                    </div>
                  </div>
                  {a.passed != null && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        a.passed
                          ? "bg-atr-arti/15 text-atr-arti"
                          : "bg-atr-red/10 text-atr-red"
                      }`}
                    >
                      {a.passed ? "Lulus" : "Belum Lulus"}
                    </span>
                  )}
                </div>
                {a.can_review ? (
                  <Link
                    href={`/peserta/kuis/${a.attempt_id}`}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-purple/40 bg-atr-purple-50 px-2.5 text-xs font-bold text-atr-purple-700 transition hover:bg-atr-purple-light/40"
                  >
                    <BookOpen className="h-3 w-3" />
                    Pembahasan
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="text-[11px] text-atr-fg-muted">
                    Pembahasan hanya untuk post-test
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
