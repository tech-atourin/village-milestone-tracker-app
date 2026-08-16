"use client";

import { useState, useTransition, useMemo, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Users,
  Award,
  Clock,
  Target,
  Loader2,
  ChevronDown,
  ChevronRight,
  UserX,
} from "lucide-react";
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
  // Pisah tabel nilai peserta dari analisis soal supaya tidak perlu scroll
  // jauh ke bawah saat soalnya banyak.
  const [tab, setTab] = useState<"peserta" | "belum" | "soal">("peserta");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { quiz, attempts, stats, item_analysis, not_taken } = results;
  const maxDist = Math.max(1, ...stats.distribution.map((d) => d.count));

  // Kelompokkan attempt per responden (by akun tercocok, atau email).
  // attempts sudah urut terbaru->terlama dari query.
  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        name: string;
        email: string;
        matched_status: QuizResults["attempts"][number]["matched_status"];
        matched_user_id: string | null;
        matched_user_name: string | null;
        items: QuizResults["attempts"];
      }
    >();
    for (const a of attempts) {
      const key =
        a.matched_user_id ?? `email:${(a.respondent_email ?? "").toLowerCase()}`;
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          name: a.respondent_name,
          email: a.respondent_email,
          matched_status: a.matched_status,
          matched_user_id: a.matched_user_id,
          matched_user_name: a.matched_user_name,
          items: [],
        };
        map.set(key, g);
      }
      g.items.push(a);
    }
    return Array.from(map.values());
  }, [attempts]);

  function toggleExpand(key: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function resolve(attemptIds: string | string[], userId: string) {
    const ids = Array.isArray(attemptIds) ? attemptIds : [attemptIds];
    if (ids.length === 0) return;
    setResolvingId(ids[0]);
    startTransition(async () => {
      try {
        // Cocokkan semua attempt milik responden yang sama ke peserta terpilih.
        for (const id of ids) await resolveAttemptMatch(id, userId || null);
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
                <MatchStat
                  label="Isi berkali-kali"
                  value={groups.filter((g) => g.items.length > 1).length}
                  tone="yellow"
                />
              </div>
              <p className="mt-3 text-[11px] text-atr-fg-muted">
                Peserta dicocokkan otomatis via email; yang belum cocok bisa
                dicocokkan manual. &quot;Isi berkali-kali&quot; = jumlah
                responden dengan lebih dari satu isian (lihat riwayat di tabel).
              </p>
            </section>
          </div>

          {/* Tab: Nilai Peserta vs Analisis Soal */}
          <div className="flex gap-1 border-b border-atr-outline">
            {(
              [
                ["peserta", `Nilai Peserta (${groups.length})`],
                ["belum", `Belum Mengisi (${not_taken.length})`],
                ["soal", `Analisis Soal (${item_analysis.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                // Matikan ligatur font: "(2)" bisa jadi karakter ② di font tertentu.
                style={{ fontVariantLigatures: "none" }}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-bold transition ${
                  tab === key
                    ? "border-atr-purple text-atr-purple-700"
                    : "border-transparent text-atr-fg-muted hover:text-atr-fg"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Item analysis */}
          {tab === "soal" && (
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
          )}

          {/* Nilai peserta - dikelompokkan per responden (multi-isian digabung) */}
          {tab === "peserta" && (
          <section className="overflow-x-auto rounded-2xl border border-atr-outline bg-white shadow-atr-1">
            <table className="w-full text-sm">
              <thead className="bg-atr-bg-soft text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Nilai (terakhir)</th>
                  <th className="px-4 py-3">Lulus</th>
                  <th className="px-4 py-3">Durasi</th>
                  <th className="px-4 py-3">Match</th>
                  <th className="px-4 py-3">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atr-outline">
                {groups.map((g) => {
                  const latest = g.items[0];
                  const multi = g.items.length > 1;
                  const isOpen = expanded.has(g.key);
                  const pcts = g.items
                    .map((i) => i.percent)
                    .filter((p): p is number => typeof p === "number");
                  const best = pcts.length ? Math.max(...pcts) : null;
                  return (
                    <Fragment key={g.key}>
                      <tr>
                        <td className="px-4 py-3 font-bold text-atr-fg">
                          <div className="flex items-center gap-1.5">
                            {multi && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(g.key)}
                                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-atr-outline text-atr-fg-muted hover:bg-atr-bg-soft"
                                aria-label="Lihat riwayat pengisian"
                              >
                                {isOpen ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </button>
                            )}
                            <span>{g.name}</span>
                            {multi && (
                              <span className="inline-flex rounded-full border border-atr-yellow/40 bg-atr-yellow/20 px-1.5 py-0.5 text-[9px] font-bold text-atr-fg">
                                {g.items.length}x isi
                              </span>
                            )}
                          </div>
                          {g.matched_user_name &&
                            g.matched_user_name !== g.name && (
                              <span className="block pl-6 text-[11px] font-normal text-atr-fg-muted">
                                → {g.matched_user_name}
                              </span>
                            )}
                        </td>
                        <td className="px-4 py-3 text-atr-fg-muted">{g.email}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-atr-fg">
                            {latest.percent ?? "-"}
                          </span>
                          <span className="text-[11px] text-atr-fg-muted">
                            {" "}
                            ({latest.score}/{latest.max_score})
                          </span>
                          {multi && best != null && (
                            <span className="block text-[10px] text-atr-fg-muted">
                              tertinggi {best}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {latest.passed == null ? (
                            <span className="text-atr-fg-muted">-</span>
                          ) : latest.passed ? (
                            <span className="font-bold text-atr-arti">Lulus</span>
                          ) : (
                            <span className="font-bold text-atr-red">Belum</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-atr-fg-muted">
                          {fmtDur(latest.duration_seconds)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${MATCH_BADGE[g.matched_status].cls}`}
                            >
                              {MATCH_BADGE[g.matched_status].label}
                            </span>
                            {g.matched_status !== "matched" &&
                              memberOptions.length > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <select
                                    defaultValue=""
                                    disabled={
                                      resolvingId === g.items[0].id || pending
                                    }
                                    onChange={(e) =>
                                      resolve(
                                        g.items.map((i) => i.id),
                                        e.target.value,
                                      )
                                    }
                                    className="max-w-[160px] rounded border border-atr-outline px-1.5 py-1 text-[11px] outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                                  >
                                    <option value="">Cocokkan ke…</option>
                                    {memberOptions.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.name}
                                      </option>
                                    ))}
                                  </select>
                                  {resolvingId === g.items[0].id && (
                                    <Loader2 className="h-3 w-3 animate-spin text-atr-fg-muted" />
                                  )}
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-atr-fg-muted">
                          {fmtDate(latest.submitted_at)}
                        </td>
                      </tr>
                      {multi && isOpen && (
                        <tr className="bg-atr-bg-soft/40">
                          <td colSpan={7} className="px-4 py-2">
                            <div className="pl-6 text-[11px] text-atr-fg-muted">
                              <div className="mb-1 font-bold uppercase tracking-wide">
                                Riwayat pengisian ({g.items.length})
                              </div>
                              <ul className="space-y-0.5">
                                {g.items.map((i, idx) => (
                                  <li
                                    key={i.id}
                                    className="flex flex-wrap items-center gap-x-3"
                                  >
                                    <span className="w-16">
                                      {idx === 0 ? "Terbaru" : `Isian ${g.items.length - idx}`}
                                    </span>
                                    <span className="font-bold text-atr-fg">
                                      Nilai {i.percent ?? "-"}
                                    </span>
                                    <span>
                                      ({i.score}/{i.max_score})
                                    </span>
                                    <span>{fmtDur(i.duration_seconds)}</span>
                                    <span>{fmtDate(i.submitted_at)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </section>
          )}

          {/* Belum mengisi: anggota peserta aktif tanpa isian tercocok */}
          {tab === "belum" && (
          <section className="rounded-2xl border border-atr-outline bg-white shadow-atr-1">
            {not_taken.length === 0 ? (
              <div className="p-10 text-center">
                <Users className="mx-auto h-8 w-8 text-atr-arti" />
                <p className="mt-2 text-sm font-bold text-atr-fg">
                  Semua peserta sudah mengisi 🎉
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-atr-outline px-4 py-3 text-sm">
                  <UserX className="h-4 w-4 text-atr-red" />
                  <span className="font-bold text-atr-fg">
                    {not_taken.length} peserta belum mengisi
                  </span>
                  <span className="text-atr-fg-muted">
                    (dari total anggota peserta project)
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-atr-bg-soft text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                    <tr>
                      <th className="px-4 py-3">Nama</th>
                      <th className="px-4 py-3">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-atr-outline">
                    {not_taken.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-bold text-atr-fg">
                          {p.full_name}
                        </td>
                        <td className="px-4 py-3 text-atr-fg-muted">
                          {p.email ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>
          )}
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
