export const metadata = { title: "Beranda" };

import Link from "next/link";
import {
  ChevronRight,
  MapPin,
  ClipboardList,
  GraduationCap,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import {
  listPesertaProjectDesa,
  listPesertaTraining,
} from "@/server/queries/peserta";
import { EmptyState } from "@/components/ui/empty-state";

export default async function PesertaHomePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [projects, trainings] = await Promise.all([
    listPesertaProjectDesa(user.id),
    listPesertaTraining(user.id),
  ]);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-atr-fg">
          Halo, {user.full_name} 👋
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Pilih project di bawah untuk lanjut isi checklist. Progress di-share
          dengan peserta lain dari desa yang sama.
        </p>
      </header>

      <Link
        href="/peserta/kuis"
        className="flex items-center gap-3 rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1 transition hover:bg-atr-bg-soft"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-atr-purple-50 text-atr-purple">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-atr-fg">Hasil Kuis Saya</div>
          <div className="text-xs text-atr-fg-muted">
            Lihat skor kuis + pembahasan post-test
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-atr-fg-muted" />
      </Link>

      {trainings.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            Pelatihan Saya
          </h2>
          <ul className="space-y-3">
            {trainings.map((t) => {
              const isOnline = t.attendance_mode === "online";
              const delta =
                t.pre_test_score != null && t.post_test_score != null
                  ? Math.round(
                      ((t.post_test_score - t.pre_test_score) /
                        Math.max(t.pre_test_score, 1)) *
                        100,
                    )
                  : null;
              return (
                <li
                  key={t.membership_id}
                  className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1"
                >
                  <Link
                    href={`/peserta/training/${t.project_id}`}
                    className="block transition hover:bg-atr-bg-soft"
                  >
                    <div className="flex items-start gap-3 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-atr-yellow/20 text-atr-fg">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-bold text-atr-fg">
                            {t.project_name}
                          </div>
                          <span
                            className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                              isOnline
                                ? "border-atr-yellow/40 bg-atr-yellow/20 text-atr-fg"
                                : "border-atr-arti/30 bg-atr-arti/15 text-atr-arti"
                            }`}
                          >
                            {isOnline ? "Online" : "Offline"}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-atr-fg-muted">
                          {t.topik_count} modul pelatihan
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-atr-fg-muted" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-atr-outline bg-atr-bg-soft px-4 py-3 text-center">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
                          Pre
                        </div>
                        <div className="text-sm font-bold text-atr-fg">
                          {t.pre_test_score ?? "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
                          Post
                        </div>
                        <div className="text-sm font-bold text-atr-purple-700">
                          {t.post_test_score ?? "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
                          Peningkatan
                        </div>
                        <div
                          className={`text-sm font-bold ${
                            delta == null
                              ? "text-atr-fg-muted"
                              : delta > 0
                                ? "text-atr-arti"
                                : "text-atr-red"
                          }`}
                        >
                          {delta == null ? "-" : `${delta}%`}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {trainings.length > 0 && projects.length > 0 && (
        <h2 className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
          Pendampingan Desa
        </h2>
      )}

      {projects.length === 0 && trainings.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada project aktif"
          description="Admin Atourin atau mitra akan menambahkan Anda ke project. Cek lagi nanti."
        />
      ) : projects.length === 0 ? null : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li
              key={p.project_desa_id}
              className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1"
            >
              <Link
                href={`/peserta/projects/${p.project_desa_id}`}
                className="block transition hover:bg-atr-bg-soft"
              >
                <div className="flex items-start gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-atr-purple-50 text-atr-purple">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-atr-fg">
                      {p.desa.name}
                    </div>
                    <div className="text-xs text-atr-fg-muted">
                      {p.project.name}
                    </div>
                    {(p.desa.kabupaten || p.desa.provinsi) && (
                      <div className="mt-0.5 text-[11px] text-atr-fg-muted">
                        {[p.desa.kabupaten, p.desa.provinsi]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-atr-fg-muted" />
                </div>
                <div className="border-t border-atr-outline bg-atr-bg-soft px-4 py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-atr-fg-muted">
                      Progress pendampingan
                    </span>
                    <span className="font-bold text-atr-fg">
                      {Math.round(p.progress.overall_pct)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full bg-atr-purple transition-all"
                      style={{ width: `${Math.round(p.progress.overall_pct)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-atr-fg-muted">
                    {p.progress.approved_items} / {p.progress.total_items}{" "}
                    checklist disetujui
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
