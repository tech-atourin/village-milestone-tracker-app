import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/ui/print-button";
import {
  isLulus,
  resolveGradingConfig,
  type GradingConfig,
} from "@/lib/rapor/scoring";

export function SertifikatView({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data,
  backHref,
  extraLogos = [],
  gradingConfig,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  backHref?: string;
  extraLogos?: Array<{ path: string; label: string; signed_url: string }>;
  gradingConfig?: Partial<GradingConfig> | null;
}) {
  // Prioritaskan prop; kalau tidak ada, ambil dari project yang di-load.
  const effectiveGrading =
    gradingConfig ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((data.project as any)?.grading_config as
      | Partial<GradingConfig>
      | null
      | undefined);
  const passingScore = resolveGradingConfig(effectiveGrading).passing_score;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = data.project as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = data.user as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rapor = data.rapor as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membership = data.membership as any;

  const pre = rapor?.pre_test_score ?? null;
  const post = rapor?.post_test_score ?? null;
  const delta =
    pre !== null && post !== null
      ? Math.round(((post - pre) / Math.max(pre, 1)) * 100)
      : null;
  // Kelulusan/berhak sertifikat: Nilai Akhir >= 70.
  const finalScore =
    rapor?.final_score != null ? Number(rapor.final_score) : null;
  const eligible = isLulus(finalScore, gradingConfig);
  const dateFmt = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date(iso))
      : "-";

  return (
    <main className="mx-auto max-w-4xl bg-white p-8 print:p-0">
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { size: A4 landscape; margin: 0; }
              .no-print { display: none !important; }
              .print-frame { box-shadow: none !important; border: none !important; }
            }
          `,
        }}
      />

      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-atr-outline bg-atr-bg-soft p-3 text-xs text-atr-fg-muted">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali
          </Link>
        ) : <span />}
        <div className="flex flex-1 items-center justify-end gap-3">
          <span className="text-right">
            <strong className="text-atr-fg">Tips:</strong> Cetak (Ctrl/⌘+P) →
            pilih layout <strong>landscape</strong> + ukuran A4 → Save as PDF.
          </span>
          <PrintButton />
        </div>
      </div>

      <article className="print-frame relative mx-auto flex aspect-[1.414/1] w-full max-w-[1100px] flex-col overflow-hidden border-[12px] border-double border-atr-purple/40 bg-gradient-to-br from-atr-purple-50/60 to-white p-8 shadow-atr-3">
        <div className="absolute left-0 top-0 h-24 w-24 border-l-4 border-t-4 border-atr-yellow" />
        <div className="absolute right-0 top-0 h-24 w-24 border-r-4 border-t-4 border-atr-yellow" />
        <div className="absolute bottom-0 left-0 h-24 w-24 border-b-4 border-l-4 border-atr-yellow" />
        <div className="absolute bottom-0 right-0 h-24 w-24 border-b-4 border-r-4 border-atr-yellow" />

        {/* Header: HANYA logo yang diupload di pengaturan project (extra
            logos). Logo organisasi/mitra sengaja tidak ditampilkan. Kalau
            belum ada logo sama sekali, fallback ke brand VMT. */}
        <header className="flex min-h-[2.75rem] flex-wrap items-center justify-center gap-6">
          {extraLogos.length > 0 ? (
            extraLogos.map((logo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={logo.path}
                src={logo.signed_url}
                alt={logo.label}
                title={logo.label}
                className="h-10 w-auto object-contain"
              />
            ))
          ) : (
            <div className="flex items-center gap-3">
              <Image
                src="/logo/vmt/vmt-app-icon.svg"
                alt="VMT"
                width={40}
                height={40}
              />
              <div>
                <div className="text-sm font-bold tracking-wide text-atr-purple-600">
                  Village Milestone Tracker
                </div>
                <div className="text-[10px] uppercase tracking-widest text-atr-fg-muted">
                  by Atourin
                </div>
              </div>
            </div>
          )}
        </header>

        <div className="mt-10 flex-1 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-[0.25em] text-atr-purple-600">
            {membership?.attendance_mode === "online"
              ? "Sertifikat Penyelesaian - Peserta Online"
              : "Sertifikat Penghargaan"}
          </h1>
          <p className="mt-5 text-xs uppercase tracking-widest text-atr-fg-muted">
            Diberikan kepada
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-atr-fg">
            {user.full_name}
          </h2>
          <p className="mt-1 text-sm text-atr-fg-muted">
            {/* Unit peserta individu: desa hanya wadah tersembunyi (namanya =
                nama peserta), jangan ditampilkan sebagai desa. */}
            {membership?.desa && !membership.desa.is_individual_unit
              ? membership.desa.name
              : membership?.attendance_mode === "online"
                ? "Peserta online"
                : "Peserta"}
            {(() => {
              const loc = [
                membership?.desa?.kabupaten,
                membership?.desa?.provinsi,
              ]
                .filter(Boolean)
                .join(", ");
              return loc ? ` · ${loc}` : "";
            })()}
          </p>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-atr-fg">
            Atas partisipasi aktif dan kontribusi dalam rangkaian program
            <br />
            <strong className="text-atr-purple-600">{project.name}</strong>
            <br />
            yang diselenggarakan oleh BAKTI KOMDIGI dan Atourin selama periode{" "}
            {dateFmt(project.period_start)} – {dateFmt(project.period_end)}.
          </p>

          {pre != null && post != null && (
            <div className="mx-auto mt-5 flex max-w-md justify-center gap-6 text-center text-xs">
              <ScoreCell label="Pre-test" value={pre} />
              <ScoreCell label="Post-test" value={post} highlight />
              <ScoreCell
                label="Nilai Akhir"
                value={finalScore != null ? finalScore.toFixed(2) : "-"}
                highlight
              />
              <ScoreCell
                label="Peningkatan"
                value={`${delta! > 0 ? "+" : ""}${delta}%`}
                emphasis={
                  delta! > 0 ? "green" : delta! < 0 ? "red" : "muted"
                }
              />
            </div>
          )}
        </div>

        {/* Tanda tangan tunggal: pejabat penyelenggara. */}
        <footer className="mt-10 flex justify-center px-6 text-center text-xs">
          <div className="w-80 max-w-full">
            <div className="text-atr-fg-muted">Mengetahui,</div>
            {/* Ruang untuk tanda tangan digital + cap */}
            <div className="mt-16 border-t border-atr-fg pt-2 font-bold text-atr-fg">
              Sudarmanto
            </div>
            <div className="mt-1.5 text-atr-fg-muted">
              Plt Direktur Layanan TI Masyarakat dan Pemerintah
            </div>
          </div>
        </footer>

        <div className="mt-3 text-center text-[9px] uppercase tracking-widest text-atr-fg-muted">
          Diterbitkan {dateFmt(rapor?.generated_at ?? new Date().toISOString())}{" "}
          · ID {user.id?.slice(0, 8) ?? "-"}-{project.id?.slice(0, 8) ?? "-"}
        </div>
      </article>

      {!eligible && (
        <p className="no-print mx-auto mt-4 max-w-[1100px] text-center text-xs text-atr-red">
          Peserta belum memenuhi syarat sertifikat (Nilai Akhir minimal{" "}
          {passingScore}
          {finalScore == null ? ", nilai belum lengkap" : ""}). Sertifikat tetap
          bisa di-print untuk preview.
        </p>
      )}
    </main>
  );
}

function ScoreCell({
  label,
  value,
  highlight,
  emphasis,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
  emphasis?: "green" | "red" | "muted";
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-2 ${
        highlight
          ? "border-atr-purple/30 bg-atr-purple-50"
          : "border-atr-outline"
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div
        className={`mt-1 text-lg font-bold ${
          emphasis === "green"
            ? "text-atr-arti"
            : emphasis === "red"
              ? "text-atr-red"
              : highlight
                ? "text-atr-purple-600"
                : "text-atr-fg"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
