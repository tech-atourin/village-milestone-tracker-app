"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Users, Award, Clock, Target, Loader2 } from "lucide-react";
import type { QuizResults } from "@/server/queries/quiz-results";
import { resolveAttemptMatch } from "@/server/actions/quizzes";

export type MemberOption = { id: string; name: string; email: string | null };

const MATCH_BADGE: Record<string, { label: string; cls: string }> = {
  matched: {
    label: "Cocok",
    cls: "border-atr-arti/30 bg-atr-arti/15 text-atr-arti",
  },
  unmatched: {
    label: "Belum cocok",
    cls: "border-atr-outline bg-atr-bg-soft text-atr-fg-muted",
  },
  ambiguous: {
    label: "Ganda",
    cls: "border-atr-yellow/40 bg-atr-yellow/20 text-atr-fg",
  },
};

function fmtDur(sec: number | null): string {
  if (sec == null) return "-";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function QuizResultsView({
  results,
  backHref,
  memberOptions = [],
}: {
  results: QuizResults;
  backHref: string;
  memberOptions?: MemberOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const { quiz, attempts, stats, item_analysis } = results;
  const maxDist = Math.max(1, ...stats.distribution.map((d) => d.count));

  function resolve(attemptId: string, userId: string) {
    setResolvingId(attemptId);
    startTransition(async () => {
      try {
        await resolveAttemptMatch(attemptId, userId || null);
        router.refresh();
      } finally {
        setResolvingId(null);
      }
    });
  }

  function exportCsv() {
    const header = [
      "Nama",
      "Email",
      "No HP",
      "Skor",
      "Maks",
      "Nilai",
      "Lulus",
      "Durasi (detik)",
      "Status Match",
      "Waktu Submit",
    ];
    const rows = attempts.map((a) => [
      a.respondent_name,
      a.respondent_email,
      a.respondent_phone ?? "",
      a.score ?? "",
      a.max_score ?? "",
      a.percent ?? "",
      a.passed == null ? "" : a.passed ? "Ya" : "Tidak",
      a.duration_seconds ?? "",
      a.matched_status,
      a.submitted_at,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hasil-kuis-${quiz.title.replace(/[^a-z0-9]+/gi, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Kuis
        </Link>
        {attempts.length > 0 && (
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold text-atr-fg">{quiz.title}</h2>
        <p className="text-sm text-atr-fg-muted">Rekap & analitik hasil kuis</p>
      </div>

      {/* Recap cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label="Responden" value={String(stats.total)} />
        <StatCard
          icon={Award}
          label="Rata-rata nilai"
          value={stats.avg_percent != null ? String(stats.avg_percent) : "-"}
          highlight
        />
        <StatCard
          icon={Target}
          label="Tingkat lulus"
          value={stats.pass_rate != null ? `${stats.pass_rate}%` : "-"}
        />
        <StatCard
          icon={Clock}
          label="Rata durasi"
          value={fmtDur(stats.avg_duration_seconds)}
        />
      </div>

      {attempts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-atr-bg-soft/40 p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-atr-fg-muted" />
          <p className="mt-2 text-sm font-bold text-atr-fg">Belum ada responden</p>
          <p className="text-xs text-atr-fg-muted">
            Bagikan link kuis agar peserta mulai mengisi.
          </p>
        </div>
      ) : (
        <>
          {/* Distribution + match summary */}
          <div className="grid gap-3 lg:grid-cols-2">
            <section className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                Distribusi Nilai
              </h3>
              <div className="space-y-2">
                {stats.distribution.map((d) => (
                  <div key={d.bucket} className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-[11px] text-atr-fg-muted">
                      {d.bucket}
                    </span>
                    <div className="h-4 flex-1 overflow-hidden rounded bg-atr-bg-soft">
                      <div
                        className="h-full rounded bg-atr-purple transition-all"
                        style={{ width: `${(d.count / maxDist) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-[11px] font-bold text-atr-fg">
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                Pencocokan Peserta
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <MatchStat label="Cocok" value={stats.matched} tone="green" />
                <MatchStat
                  label="Belum cocok"
                  value={stats.unmatched}
                  tone="muted"
                />
                <MatchStat label="Ganda" value={stats.ambiguous} tone="yellow" />
              </div>
              <p className="mt-3 text-[11px] text-atr-fg-muted">
                Peserta dicocokkan otomatis via email. Yang belum cocok akan
                otomatis terhubung saat akun peserta dengan email sama dibuat.
              </p>
            </section>
          </div>

          {/* Item analysis */}
          <section className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              Analisis Soal (tingkat jawaban benar)
            </h3>
            <div className="space-y-2.5">
              {item_analysis.map((it, idx) => (
                <div key={it.question_id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate text-atr-fg">
                      {idx + 1}. {it.prompt}
                    </span>
                    <span
                      className={`shrink-0 font-bold ${
                        it.correct_rate >= 60
                          ? "text-atr-arti"
                          : it.correct_rate >= 40
                            ? "text-atr-fg"
                            : "text-atr-red"
                      }`}
                    >
                      {it.correct_rate}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-atr-bg-soft">
                    <div
                      className={`h-full rounded-full transition-all ${
                        it.correct_rate >= 60
                          ? "bg-atr-arti"
                          : it.correct_rate >= 40
                            ? "bg-atr-yellow"
                            : "bg-atr-red"
                      }`}
                      style={{ width: `${it.correct_rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Attempts table */}
          <section className="overflow-x-auto rounded-2xl border border-atr-outline bg-white shadow-atr-1">
            <table className="w-full text-sm">
              <thead className="bg-atr-bg-soft text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Nilai</th>
                  <th className="px-4 py-3">Lulus</th>
                  <th className="px-4 py-3">Durasi</th>
                  <th className="px-4 py-3">Match</th>
                  <th className="px-4 py-3">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atr-outline">
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-bold text-atr-fg">
                      {a.respondent_name}
                      {a.matched_user_name &&
                        a.matched_user_name !== a.respondent_name && (
                          <span className="block text-[11px] font-normal text-atr-fg-muted">
                            → {a.matched_user_name}
                          </span>
                        )}
                    </td>
                    <td className="px-4 py-3 text-atr-fg-muted">
                      {a.respondent_email}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-atr-fg">{a.percent ?? "-"}</span>
                      <span className="text-[11px] text-atr-fg-muted">
                        {" "}
                        ({a.score}/{a.max_score})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.passed == null ? (
                        <span className="text-atr-fg-muted">-</span>
                      ) : a.passed ? (
                        <span className="font-bold text-atr-arti">Lulus</span>
                      ) : (
                        <span className="font-bold text-atr-red">Belum</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-atr-fg-muted">
                      {fmtDur(a.duration_seconds)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${MATCH_BADGE[a.matched_status].cls}`}
                        >
                          {MATCH_BADGE[a.matched_status].label}
                        </span>
                        {a.matched_status !== "matched" &&
                          memberOptions.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <select
                                defaultValue=""
                                disabled={resolvingId === a.id || pending}
                                onChange={(e) => resolve(a.id, e.target.value)}
                                className="max-w-[160px] rounded border border-atr-outline px-1.5 py-1 text-[11px]"
                              >
                                <option value="">Cocokkan ke…</option>
                                {memberOptions.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                              {resolvingId === a.id && (
                                <Loader2 className="h-3 w-3 animate-spin text-atr-fg-muted" />
                              )}
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-atr-fg-muted">
                      {fmtDate(a.submitted_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1">
      <Icon className="h-4 w-4 text-atr-fg-muted" />
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div
        className={`text-xl font-bold ${highlight ? "text-atr-purple-700" : "text-atr-fg"}`}
      >
        {value}
      </div>
    </div>
  );
}

function MatchStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "muted" | "yellow";
}) {
  const color =
    tone === "green"
      ? "text-atr-arti"
      : tone === "yellow"
        ? "text-atr-fg"
        : "text-atr-fg-muted";
  return (
    <div className="rounded-xl border border-atr-outline bg-atr-bg-soft/40 p-3">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
    </div>
  );
}
