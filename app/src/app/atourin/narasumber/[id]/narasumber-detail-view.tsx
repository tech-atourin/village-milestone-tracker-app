import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Folder,
  CheckCircle2,
  Star,
} from "lucide-react";
import type { getNarasumberDetail } from "@/server/queries/narasumber";
import { EmptyState } from "@/components/ui/empty-state";

type NarasumberDetail = NonNullable<
  Awaited<ReturnType<typeof getNarasumberDetail>>
>;

const KATEGORI_LABEL: Record<string, string> = {
  praktisi: "Praktisi",
  akademisi: "Akademisi",
  profesional: "Profesional",
  pns: "PNS",
  lainnya: "Lain-lain",
};

function fmtDate(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function NarasumberDetailView({
  data,
  backHref,
}: {
  data: NarasumberDetail;
  backHref: string;
}) {
  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar narasumber
      </Link>

      {/* Profile card */}
      <article className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1">
        <div className="bg-gradient-to-br from-atr-yellow/20 to-white p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-atr-yellow/40 text-atr-fg">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
                {data.full_name}
              </h1>
              {data.jabatan && (
                <p className="text-sm text-atr-fg-muted">{data.jabatan}</p>
              )}
              {data.instansi && (
                <p className="inline-flex items-center gap-1 text-sm text-atr-fg-muted">
                  <Building2 className="h-3 w-3" />
                  {data.instansi}
                </p>
              )}
              {data.kategori_narasumber && (
                <span className="mt-2 inline-flex rounded-full bg-atr-purple-50 px-2.5 py-0.5 text-xs font-bold text-atr-purple-600">
                  {KATEGORI_LABEL[data.kategori_narasumber] ??
                    data.kategori_narasumber}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-4 border-t border-atr-outline p-6 text-sm sm:grid-cols-2">
          {data.kompetensi && (
            <div className="sm:col-span-2">
              <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                Kompetensi
              </div>
              <p className="mt-1 text-atr-fg">{data.kompetensi}</p>
            </div>
          )}
          {data.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-atr-fg-muted" />
              <span className="text-atr-fg">{data.email}</span>
            </div>
          )}
          {data.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-atr-fg-muted" />
              <span className="text-atr-fg">{data.phone}</span>
            </div>
          )}
          {data.kota && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-atr-fg-muted" />
              <span className="text-atr-fg">{data.kota}</span>
            </div>
          )}
        </div>
      </article>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Folder}
          label="Project Didampingi"
          value={data.projects_count}
        />
        <Stat icon={MapPin} label="Desa Mentor-an" value={data.desa_count} />
        <Stat icon={CheckCircle2} label="Total Sesi" value={data.sessions_count} />
        <article className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            <Star className="h-4 w-4 text-atr-yellow" />
            Rating Peserta
          </div>
          {data.avg_rating != null ? (
            <>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-2xl font-bold text-atr-fg">
                  {data.avg_rating.toFixed(1)}
                </span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${
                        s <= Math.round(data.avg_rating!)
                          ? "fill-atr-yellow text-atr-yellow"
                          : "text-atr-outline"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-0.5 text-[11px] text-atr-fg-muted">
                dari {data.rating_count} penilaian peserta
              </div>
            </>
          ) : (
            <div className="mt-2 text-sm italic text-atr-fg-muted">
              Belum ada penilaian
            </div>
          )}
        </article>
      </div>

      {/* Riwayat */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          <Calendar className="h-3.5 w-3.5" />
          Riwayat Program ({data.riwayat.length})
        </h2>
        {data.riwayat.length === 0 ? (
          <EmptyState
            icon={Calendar}
            variant="compact"
            title="Belum pernah memimpin sesi pendampingan"
            description="Riwayat program akan muncul setelah narasumber mencatat sesi pertama."
          />
        ) : (
          <ol className="relative space-y-3 border-l-2 border-atr-purple/30 pl-6">
            {data.riwayat.map((r) => (
              <li key={r.project_id} className="relative">
                <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-atr-purple text-white">
                  <Calendar className="h-2.5 w-2.5" />
                </span>
                <div className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-atr-fg">
                        {r.project_name}
                      </h3>
                      <p className="text-[11px] text-atr-fg-muted">
                        {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.desa_names.map((d) => (
                          <span
                            key={d}
                            className="inline-flex rounded-full bg-atr-purple-50 px-2 py-0.5 text-[10px] font-bold text-atr-purple-600"
                          >
                            <MapPin className="mr-0.5 h-2.5 w-2.5" />
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-atr-fg">
                        {r.sessions_count}
                      </div>
                      <div className="text-[10px] font-bold uppercase text-atr-fg-muted">
                        Sesi
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
          {label}
        </span>
        <Icon className="h-4 w-4 text-atr-fg-muted" />
      </div>
      <div className="mt-2 text-3xl font-bold text-atr-fg">{value}</div>
    </div>
  );
}
