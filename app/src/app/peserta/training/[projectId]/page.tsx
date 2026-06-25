export const metadata = { title: "Pelatihan" };

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  GraduationCap,
  Award,
  CalendarRange,
  BookOpen,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { getPesertaTrainingDetail } from "@/server/queries/peserta";

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function PesertaTrainingPage({
  params,
}: {
  params: { projectId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const data = await getPesertaTrainingDetail(user.id, params.projectId);
  if (!data) notFound();

  const { project, membership, topik, materi_scores, sessions } = data;
  const isOnline = membership.attendance_mode === "online";
  const preAvg = avgOf(materi_scores.map((m) => m.pre));
  const postAvg = avgOf(materi_scores.map((m) => m.post));
  const delta =
    preAvg !== null && postAvg !== null
      ? Math.round(((postAvg - preAvg) / Math.max(preAvg, 1)) * 100)
      : null;

  return (
    <div className="space-y-5">
      <Link
        href="/peserta/home"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke beranda
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-atr-fg">
            {project.name}
          </h1>
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              isOnline
                ? "border-atr-yellow/40 bg-atr-yellow/20 text-atr-fg"
                : "border-atr-arti/30 bg-atr-arti/15 text-atr-arti"
            }`}
          >
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
        {project.description && (
          <p className="text-sm text-atr-fg-muted">{project.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-atr-fg-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarRange className="h-3.5 w-3.5" />
            {fmtDate(project.period_start)} – {fmtDate(project.period_end)}
          </span>
          {project.organization_name && (
            <span>Mitra: {project.organization_name}</span>
          )}
        </div>
      </header>

      {isOnline && (
        <div className="rounded-lg border border-atr-yellow/40 bg-atr-yellow/15 px-3.5 py-2.5 text-xs text-atr-fg">
          🟡 <strong>Mode online.</strong> Anda mengikuti pelatihan ini via
          jalur online - pre-test, materi, dan post-test. Sesi pendampingan
          lapangan tidak diikuti, action plan opsional.
        </div>
      )}

      {/* Skor pre/post */}
      <section className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
          Skor Anda
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <ScoreBox label="Pre-test" value={preAvg} />
          <ScoreBox label="Post-test" value={postAvg} highlight />
          <ScoreBox
            label="Peningkatan"
            value={delta}
            suffix="%"
            tone={delta == null ? "muted" : delta > 0 ? "green" : "red"}
          />
        </div>
      </section>

      {/* Modul / topik (read-only) */}
      <section className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
        <h2 className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
          <BookOpen className="h-3.5 w-3.5" />
          Modul Pelatihan ({topik.length})
        </h2>
        {topik.length === 0 ? (
          <p className="text-sm text-atr-fg-muted">Belum ada modul terdaftar.</p>
        ) : (
          <ul className="space-y-3">
            {topik.map((t) => {
              const scoreRow = materi_scores.find((m) => m.topik_id === t.id);
              return (
                <li
                  key={t.id}
                  className="rounded-xl border border-atr-outline bg-atr-bg-soft/40 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-atr-fg">
                        {t.sort_order}. {t.name}
                      </div>
                      {t.description && (
                        <p className="mt-0.5 text-xs text-atr-fg-muted">
                          {t.description}
                        </p>
                      )}
                    </div>
                    {scoreRow && (
                      <div className="flex shrink-0 items-center gap-2 text-[11px]">
                        <span className="text-atr-fg-muted">
                          Pre: <strong>{scoreRow.pre ?? "-"}</strong>
                        </span>
                        <span className="text-atr-fg-muted">
                          Post: <strong>{scoreRow.post ?? "-"}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                  {t.items.length > 0 && (
                    <ul className="mt-2 space-y-1 pl-3 text-xs text-atr-fg-muted">
                      {t.items.map((it) => (
                        <li key={it.id} className="list-disc">
                          {it.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Sesi pendampingan (offline only) */}
      {!isOnline && sessions.length > 0 && (
        <section className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
          <h2 className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            <GraduationCap className="h-3.5 w-3.5" />
            Sesi Pendampingan ({sessions.length})
          </h2>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-atr-outline bg-white p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-bold text-atr-fg">{s.materi ?? "-"}</div>
                    <div className="text-[11px] text-atr-fg-muted">
                      Hari {s.day_number} · {fmtDate(s.session_date)}
                      {s.narasumber_name && ` · oleh ${s.narasumber_name}`}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Rapor + Sertifikat link */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href={`/atourin/projects/${project.id}/rapor/${user.id}`}
          className="flex items-center gap-3 rounded-2xl border border-atr-purple/30 bg-atr-purple-50/50 p-4 transition hover:bg-atr-purple-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-atr-purple text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-atr-fg">Lihat Rapor</div>
            <div className="text-xs text-atr-fg-muted">
              Nilai per modul + rekap pelatihan
            </div>
          </div>
        </Link>
        <Link
          href={`/atourin/projects/${project.id}/rapor/${user.id}/sertifikat`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-atr-yellow/40 bg-atr-yellow/10 p-4 transition hover:bg-atr-yellow/20"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-atr-yellow text-atr-fg">
            <Award className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-atr-fg">Buka Sertifikat</div>
            <div className="text-xs text-atr-fg-muted">
              {isOnline
                ? "Sertifikat Penyelesaian (peserta online)"
                : "Sertifikat Penghargaan (peserta offline)"}
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}

function avgOf(nums: Array<number | null>): number | null {
  const valid = nums.filter((n): n is number => typeof n === "number");
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

function ScoreBox({
  label,
  value,
  suffix,
  highlight,
  tone,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  highlight?: boolean;
  tone?: "green" | "red" | "muted";
}) {
  const color =
    tone === "green"
      ? "text-atr-arti"
      : tone === "red"
        ? "text-atr-red"
        : highlight
          ? "text-atr-purple-700"
          : "text-atr-fg";
  return (
    <div className="rounded-xl border border-atr-outline bg-atr-bg-soft/40 p-3 text-center">
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className={`mt-0.5 text-xl font-bold ${color}`}>
        {value ?? "-"}
        {value != null && suffix}
      </div>
    </div>
  );
}
