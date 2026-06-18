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
  Target,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import type { RaporDesaDetail } from "@/server/queries/rapor-desa";
import { PrintButton } from "@/components/ui/print-button";

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
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
  sertifikatHref,
}: {
  data: RaporDesaDetail;
  backHref: string;
  sertifikatHref?: string;
}) {
  const {
    project,
    desa,
    aggregate,
    peserta,
    topik,
    narasumber,
    action_plans,
    swot,
  } = data;
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

      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-2">
        <Link
          href={backHref}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali
        </Link>
        <div className="flex items-center gap-2">
          <PrintButton />
          {sertifikatHref && (
            <a
              href={sertifikatHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-xs font-bold text-white transition hover:bg-atr-purple-600"
            >
              🏆 Buka Sertifikat Desa
            </a>
          )}
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
            {[desa.kabupaten, desa.provinsi].filter(Boolean).join(", ") || "-"}
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
                {project.organization?.name ?? "-"}
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
            {formatDate(project.period_start)} -{" "}
            {formatDate(project.period_end)}
          </div>
        </div>
      </section>

      {/* Aggregate scores */}
      <section className="mb-8 overflow-hidden rounded-2xl border border-atr-purple/20 bg-gradient-to-br from-atr-purple-50/40 to-white p-6 shadow-atr-1">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-purple-600">
          <Users className="h-3.5 w-3.5" />
          Hasil Akumulasi Perwakilan Peserta
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ScoreCard
            label="Peserta"
            value={`${aggregate.peserta_with_rapor}/${aggregate.peserta_count}`}
            hint="dengan rapor"
            palette="purple"
          />
          <ScoreCard
            label="Avg Pre"
            value={aggregate.avg_pre != null ? String(aggregate.avg_pre) : "-"}
            palette="yellow"
          />
          <ScoreCard
            label="Avg Post"
            value={aggregate.avg_post != null ? String(aggregate.avg_post) : "-"}
            palette="green"
          />
          <ScoreCard
            label="Avg Improvement"
            value={
              aggregate.avg_improvement != null
                ? `${aggregate.avg_improvement > 0 ? "+" : ""}${aggregate.avg_improvement}%`
                : "-"
            }
            palette="purple-strong"
            accent
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg bg-white/60 px-3 py-2">
            <span className="text-atr-fg-muted">Avg kehadiran: </span>
            <strong className="text-atr-fg">
              {aggregate.avg_attendance != null
                ? `${aggregate.avg_attendance}%`
                : "-"}
            </strong>
          </div>
          <div className="rounded-lg bg-white/60 px-3 py-2">
            <span className="text-atr-fg-muted">Bukti disetujui: </span>
            <strong className="text-atr-fg">{aggregate.evidence_approved}</strong>
          </div>
        </div>
      </section>

      {/* Checklist completion */}
      <section className="mb-8 rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-fg">
          <ClipboardList className="h-3.5 w-3.5 text-atr-purple" />
          Progress Pendampingan per Materi
        </h2>
        <div className="mb-5 rounded-xl bg-atr-purple-50/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-atr-fg">Overall completion</span>
            <span className="text-2xl font-bold text-atr-purple-600">
              {Math.round(aggregate.checklist_completion_pct)}%
            </span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-atr-purple to-atr-purple-600 transition-all"
              style={{
                width: `${Math.round(aggregate.checklist_completion_pct)}%`,
              }}
            />
          </div>
        </div>
        {topik.length > 0 && (
          <ul className="space-y-3">
            {topik.map((t, i) => {
              const pct = Math.round(t.completion_percent);
              const isDone = pct >= 100;
              const isHigh = pct >= 70;
              const isMid = pct >= 40;
              const barColor = isDone
                ? "from-atr-arti to-atr-arti"
                : isHigh
                  ? "from-atr-purple to-atr-purple-600"
                  : isMid
                    ? "from-atr-yellow to-atr-yellow"
                    : "from-atr-red/60 to-atr-red/80";
              const pctColor = isDone
                ? "text-atr-arti"
                : isHigh
                  ? "text-atr-purple-600"
                  : isMid
                    ? "text-atr-fg"
                    : "text-atr-red";
              return (
                <li key={t.topik_id || i} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="inline-flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-atr-purple-50 text-[10px] font-bold text-atr-purple-600">
                        {i + 1}
                      </span>
                      <span className="font-bold text-atr-fg">{t.title}</span>
                      {isDone && (
                        <span className="inline-flex items-center rounded-full bg-atr-arti/15 px-2 py-0.5 text-[10px] font-bold text-atr-arti">
                          Selesai
                        </span>
                      )}
                    </div>
                    <span className={`text-sm font-bold ${pctColor}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-atr-bg-soft">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
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
                ★ {narasumber.avg_rating?.toFixed(2) ?? "-"}
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
                    {n.rating_count > 0 ? `★ ${n.avg_rating.toFixed(2)}` : "-"}
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
            <Mini
              label="Rencana"
              value={String(action_plans.by_status.rencana)}
              tone="muted"
            />
            <Mini
              label="On Track"
              value={String(action_plans.by_status.on_track)}
              tone="purple"
            />
            <Mini
              label="Selesai"
              value={String(action_plans.by_status.selesai)}
              accent
            />
            <Mini
              label="Ditunda"
              value={String(action_plans.by_status.ditunda)}
              tone="yellow"
            />
          </div>
        </section>
      )}

      {/* SWOT analysis */}
      {swot &&
        (swot.strengths.length > 0 ||
          swot.weaknesses.length > 0 ||
          swot.opportunities.length > 0 ||
          swot.threats.length > 0) && (
          <section className="mb-8 rounded-2xl border border-atr-outline p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
              <Target className="h-3.5 w-3.5" />
              SWOT Analysis Desa
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <SwotQuad
                title="Strengths"
                icon={Award}
                palette="green"
                items={swot.strengths}
              />
              <SwotQuad
                title="Weaknesses"
                icon={AlertCircle}
                palette="red"
                items={swot.weaknesses}
              />
              <SwotQuad
                title="Opportunities"
                icon={Lightbulb}
                palette="yellow"
                items={swot.opportunities}
              />
              <SwotQuad
                title="Threats"
                icon={TrendingUp}
                palette="purple"
                items={swot.threats}
              />
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
                    {p.pre_test_score ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-right text-atr-fg">
                    {p.post_test_score ?? "-"}
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
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-atr-fg">
                    {p.attendance != null ? `${p.attendance}%` : "-"}
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
        <span>
          Rapor Desa ·{" "}
          {new Intl.DateTimeFormat("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }).format(new Date())}
        </span>
        <div className="flex items-center gap-2">
          <Image src="/logo/vmt/vmt-mark.svg" alt="VMT" width={20} height={20} />
          <span className="font-bold">Village Milestone Tracker</span>
        </div>
      </div>
    </main>
  );
}

function SwotQuad({
  title,
  icon: Icon,
  palette,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  palette: "green" | "red" | "yellow" | "purple";
  items: string[];
}) {
  const styles: Record<string, string> = {
    green: "border-atr-arti/30 bg-atr-arti/5",
    red: "border-atr-red/30 bg-atr-red/5",
    yellow: "border-atr-yellow/40 bg-atr-yellow/10",
    purple: "border-atr-purple/30 bg-atr-purple-50/50",
  };
  const titleColor: Record<string, string> = {
    green: "text-atr-arti",
    red: "text-atr-red",
    yellow: "text-atr-fg",
    purple: "text-atr-purple-600",
  };
  return (
    <article className={`rounded-xl border p-3 ${styles[palette]}`}>
      <header
        className={`mb-1.5 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide ${titleColor[palette]}`}
      >
        <Icon className="h-3 w-3" />
        {title}
      </header>
      {items.length === 0 ? (
        <p className="text-[11px] italic text-atr-fg-muted">-</p>
      ) : (
        <ul className="space-y-1 text-[11px] text-atr-fg">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="mt-1 h-0.5 w-0.5 shrink-0 rounded-full bg-atr-fg-muted" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function Mini({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: "purple" | "green" | "yellow" | "muted";
}) {
  const palette = accent ? "green" : tone ?? "muted";
  const styles: Record<string, { card: string; value: string }> = {
    purple: {
      card: "border-atr-purple/30 bg-atr-purple-50/60",
      value: "text-atr-purple-600",
    },
    green: {
      card: "border-atr-arti/40 bg-atr-arti/10",
      value: "text-atr-arti",
    },
    yellow: {
      card: "border-atr-yellow/40 bg-atr-yellow/15",
      value: "text-atr-fg",
    },
    muted: {
      card: "border-atr-outline bg-atr-bg-soft/60",
      value: "text-atr-fg",
    },
  };
  const s = styles[palette];
  return (
    <div className={`rounded-lg border p-2.5 text-center ${s.card}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className={`mt-1 text-lg font-bold ${s.value}`}>{value}</div>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  hint,
  accent,
  palette,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  palette?: "purple" | "purple-strong" | "yellow" | "green" | "red";
}) {
  const paletteStyle: Record<string, { card: string; value: string }> = {
    purple: {
      card: "border-atr-purple/20 bg-white",
      value: "text-atr-purple-600",
    },
    "purple-strong": {
      card: "border-atr-purple/40 bg-atr-purple-50",
      value: "text-atr-purple-600",
    },
    yellow: {
      card: "border-atr-yellow/40 bg-atr-yellow/10",
      value: "text-atr-fg",
    },
    green: {
      card: "border-atr-arti/30 bg-atr-arti/10",
      value: "text-atr-arti",
    },
    red: { card: "border-atr-red/30 bg-atr-red/5", value: "text-atr-red" },
  };
  const cls = palette
    ? paletteStyle[palette]
    : accent
      ? paletteStyle["purple-strong"]
      : { card: "border-atr-outline bg-white", value: "text-atr-fg" };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${cls.card}`}>
      <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-bold ${cls.value}`}>{value}</div>
      {hint && <div className="text-[10px] text-atr-fg-muted">{hint}</div>}
    </div>
  );
}
