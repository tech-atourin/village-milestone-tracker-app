import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  MapPin,
  TrendingUp,
  Users,
  Award,
  Star,
  GraduationCap,
  ClipboardList,
} from "lucide-react";
import type { RaporDesaDetail } from "@/server/queries/rapor-desa";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

const TIER_LABEL: Record<string, string> = {
  unclassified: "Belum Diklasifikasi",
  rintisan: "Rintisan",
  berkembang: "Berkembang",
  maju: "Maju",
  mandiri: "Mandiri",
};

export function RaporDesaPrintable({
  data,
  backHref,
}: {
  data: RaporDesaDetail;
  backHref: string;
}) {
  const { project, desa, aggregate, peserta, topik, narasumber, action_plans } = data;
  const tierLabel =
    TIER_LABEL[desa.current_classification ?? "unclassified"] ??
    "Belum Diklasifikasi";

  return (
    <main className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { size: A4; margin: 18mm; }
              .no-print { display: none !important; }
            }
          `,
        }}
      />

      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
        <div className="rounded-lg border border-atr-outline bg-atr-bg-soft px-3 py-1.5 text-xs text-atr-fg-muted">
          <strong className="text-atr-fg">Tips:</strong> Ctrl/⌘+P → Save as
          PDF
        </div>
      </div>

      {/* Header */}
      <header className="mb-8 flex items-start justify-between border-b border-atr-outline pb-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-atr-purple">
            Rapor Desa Wisata
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-atr-fg">
            <MapPin className="h-5 w-5 text-atr-purple" />
            {desa.name}
          </h1>
          <p className="mt-1 text-sm text-atr-fg-muted">
            {[desa.kabupaten, desa.provinsi].filter(Boolean).join(", ") || "—"}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-atr-purple-50 px-2.5 py-0.5 text-xs font-bold text-atr-purple-600">
            <Award className="h-3 w-3" />
            Klasifikasi: {tierLabel}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {project.organization?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.organization.logo_url}
              alt={project.organization.name}
              className="h-14 w-auto"
            />
          ) : (
            <div className="text-right text-xs text-atr-fg-muted">
              <div className="font-bold text-atr-fg">
                {project.organization?.name ?? "—"}
              </div>
              <div>powered by Atourin</div>
            </div>
          )}
        </div>
      </header>

      {/* Project meta */}
      <section className="mb-8 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            Project
          </div>
          <div className="mt-1 font-bold text-atr-fg">{project.name}</div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            Periode
          </div>
          <div className="mt-1 font-bold text-atr-fg">
            {formatDate(project.period_start)} —{" "}
            {formatDate(project.period_end)}
          </div>
        </div>
      </section>

      {/* Aggregate scores */}
      <section className="mb-8 rounded-2xl border border-atr-outline p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          Hasil Akumulasi Perwakilan Peserta
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ScoreCard
            label="Peserta"
            value={`${aggregate.peserta_with_rapor}/${aggregate.peserta_count}`}
            hint="dengan rapor"
          />
          <ScoreCard
            label="Avg Pre"
            value={aggregate.avg_pre != null ? String(aggregate.avg_pre) : "—"}
          />
          <ScoreCard
            label="Avg Post"
            value={aggregate.avg_post != null ? String(aggregate.avg_post) : "—"}
          />
          <ScoreCard
            label="Avg Improvement"
            value={
              aggregate.avg_improvement != null
                ? `${aggregate.avg_improvement > 0 ? "+" : ""}${aggregate.avg_improvement}%`
                : "—"
            }
            accent
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-atr-fg-muted">
          <div>
            Avg attendance:{" "}
            <strong className="text-atr-fg">
              {aggregate.avg_attendance != null
                ? `${aggregate.avg_attendance}%`
                : "—"}
            </strong>
          </div>
          <div>
            Evidence approved:{" "}
            <strong className="text-atr-fg">{aggregate.evidence_approved}</strong>
          </div>
        </div>
      </section>

      {/* Checklist completion */}
      <section className="mb-8 rounded-2xl border border-atr-outline p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          Progress Pendampingan (Checklist)
        </h2>
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-atr-fg">
              Overall completion
            </span>
            <span className="font-bold text-atr-purple-600">
              {Math.round(aggregate.checklist_completion_pct)}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-atr-bg-soft">
            <div
              className="h-full bg-atr-purple transition-all"
              style={{
                width: `${Math.round(aggregate.checklist_completion_pct)}%`,
              }}
            />
          </div>
        </div>
        {topik.length > 0 && (
          <ul className="space-y-2">
            {topik.map((t) => (
              <li
                key={t.topik_id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-atr-fg">{t.title}</span>
                <span className="font-bold text-atr-fg-muted">
                  {Math.round(t.completion_percent)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Kuisioner Narasumber */}
      {narasumber.rating_count > 0 && (
        <section className="mb-8 rounded-2xl border border-atr-outline p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
            <GraduationCap className="h-3.5 w-3.5" />
            Kuisioner Narasumber
          </h2>
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-atr-yellow/10 px-3 py-2 text-xs">
            <Star className="h-4 w-4 fill-atr-yellow text-atr-yellow" />
            <span className="text-atr-fg">
              Rata-rata penilaian peserta desa ini ke narasumber:{" "}
              <strong>
                ★ {narasumber.avg_rating?.toFixed(2) ?? "—"}
              </strong>{" "}
              dari {narasumber.rating_count} penilaian.
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-atr-outline text-xs text-atr-fg-muted">
                <th className="py-2 text-left">Narasumber</th>
                <th className="py-2 text-right">Sesi</th>
                <th className="py-2 text-right">Rating ★</th>
                <th className="py-2 text-right">Penilaian</th>
              </tr>
            </thead>
            <tbody>
              {narasumber.by_narasumber.map((n) => (
                <tr
                  key={n.narasumber_id}
                  className="border-b border-atr-outline/50"
                >
                  <td className="py-2 font-bold text-atr-fg">{n.name}</td>
                  <td className="py-2 text-right text-atr-fg-muted">
                    {n.sessions_count}
                  </td>
                  <td className="py-2 text-right font-bold text-atr-fg">
                    {n.rating_count > 0 ? `★ ${n.avg_rating.toFixed(2)}` : "—"}
                  </td>
                  <td className="py-2 text-right text-atr-fg-muted">
                    {n.rating_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Rencana Aksi summary */}
      {action_plans.total > 0 && (
        <section className="mb-8 rounded-2xl border border-atr-outline p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
            <ClipboardList className="h-3.5 w-3.5" />
            Rencana Aksi Desa ({action_plans.total})
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Mini label="Rencana" value={String(action_plans.by_status.rencana)} />
            <Mini label="On Track" value={String(action_plans.by_status.on_track)} />
            <Mini
              label="Selesai"
              value={String(action_plans.by_status.selesai)}
              accent
            />
            <Mini label="Ditunda" value={String(action_plans.by_status.ditunda)} />
          </div>
        </section>
      )}

      {/* Peserta breakdown */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          <Users className="h-3.5 w-3.5" />
          Perwakilan Peserta ({peserta.length})
        </h2>
        <div className="overflow-hidden rounded-2xl border border-atr-outline">
          <table className="w-full text-sm">
            <thead className="bg-atr-bg-soft text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              <tr>
                <th className="px-4 py-2">Nama</th>
                <th className="px-3 py-2 text-right">Pre</th>
                <th className="px-3 py-2 text-right">Post</th>
                <th className="px-3 py-2 text-right">Δ</th>
                <th className="px-3 py-2 text-right">Kehadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-atr-outline">
              {peserta.map((p) => (
                <tr key={p.user_id}>
                  <td className="px-4 py-2 font-bold text-atr-fg">
                    {p.full_name}
                    {p.email && (
                      <div className="text-[11px] font-normal text-atr-fg-muted">
                        {p.email}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-atr-fg">
                    {p.pre_test_score ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-atr-fg">
                    {p.post_test_score ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {p.improvement_percent != null ? (
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold ${
                          p.improvement_percent >= 0
                            ? "text-atr-arti"
                            : "text-atr-red"
                        }`}
                      >
                        <TrendingUp className="h-3 w-3" />
                        {p.improvement_percent > 0 ? "+" : ""}
                        {p.improvement_percent}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-atr-fg">
                    {p.attendance != null ? `${p.attendance}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 grid grid-cols-2 gap-12 border-t border-atr-outline pt-8 text-xs">
        <div className="text-center">
          <div className="text-atr-fg-muted">Mengetahui,</div>
          <div className="mt-16 border-t border-atr-fg pt-1 font-bold text-atr-fg">
            {project.organization?.name ?? "Mitra"}
          </div>
        </div>
        <div className="text-center">
          <div className="text-atr-fg-muted">Atourin Mentor</div>
          <div className="mt-16 border-t border-atr-fg pt-1 font-bold text-atr-fg">
            Tim Atourin
          </div>
        </div>
      </footer>

      <div className="mt-8 flex items-center justify-between text-[10px] text-atr-fg-muted">
        <span>Rapor Desa · digenerate dari akumulasi peserta</span>
        <div className="flex items-center gap-2">
          <Image src="/logo/vmt/vmt-mark.svg" alt="VMT" width={20} height={20} />
          <span className="font-bold">Village Milestone Tracker</span>
        </div>
      </div>
    </main>
  );
}

function Mini({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-2.5 text-center ${
        accent
          ? "border-atr-arti/30 bg-atr-arti/10"
          : "border-atr-outline bg-atr-bg-soft/60"
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div
        className={`mt-1 text-lg font-bold ${
          accent ? "text-atr-arti" : "text-atr-fg"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "border-atr-purple/30 bg-atr-purple-50"
          : "border-atr-outline"
      }`}
    >
      <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div
        className={`mt-2 text-2xl font-bold ${
          accent ? "text-atr-purple-600" : "text-atr-fg"
        }`}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[10px] text-atr-fg-muted">{hint}</div>
      )}
    </div>
  );
}
