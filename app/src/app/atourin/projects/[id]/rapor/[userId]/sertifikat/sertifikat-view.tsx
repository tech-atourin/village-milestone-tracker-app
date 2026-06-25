import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/ui/print-button";

export function SertifikatView({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data,
  backHref,
  extraLogos = [],
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  backHref?: string;
  extraLogos?: Array<{ path: string; label: string; signed_url: string }>;
}) {
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
  const eligible = (post ?? 0) >= 70 && (delta ?? 0) >= 20;
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

        <header className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo/vmt/vmt-app-icon.svg" alt="VMT" width={48} height={48} />
            <div>
              <div className="text-sm font-bold tracking-wide text-atr-purple-600">
                Village Milestone Tracker
              </div>
              <div className="text-[10px] uppercase tracking-widest text-atr-fg-muted">
                by Atourin
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {extraLogos.map((logo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={logo.path}
                src={logo.signed_url}
                alt={logo.label}
                title={logo.label}
                className="h-14 w-auto object-contain"
              />
            ))}
            {project.organization?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.organization.logo_url}
                alt={project.organization.name}
                className="h-14 w-auto object-contain"
              />
            ) : extraLogos.length === 0 ? (
              <div className="text-right text-xs text-atr-fg-muted">
                <div className="font-bold text-atr-fg">
                  {project.organization?.name ?? "Atourin"}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <div className="mt-4 flex-1 text-center">
          <h1 className="text-sm font-bold uppercase tracking-[0.25em] text-atr-purple-600">
            {membership?.attendance_mode === "online"
              ? "Sertifikat Penyelesaian - Peserta Online"
              : "Sertifikat Penghargaan"}
          </h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-atr-fg-muted">
            Diberikan kepada
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-atr-fg">
            {user.full_name}
          </h2>
          <p className="mt-1 text-sm text-atr-fg-muted">
            {membership?.desa?.name ??
              (membership?.attendance_mode === "online"
                ? "Peserta online"
                : "Peserta")}
            {membership?.desa?.kabupaten &&
              ` · ${membership.desa.kabupaten}, ${membership.desa.provinsi}`}
          </p>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-atr-fg">
            Atas partisipasi aktif dan{" "}
            {eligible ? "pencapaian signifikan" : "kontribusi"} dalam program
            <br />
            <strong className="text-atr-purple-600">{project.name}</strong>
            <br />
            periode {dateFmt(project.period_start)} – {dateFmt(project.period_end)}.
          </p>

          {pre != null && post != null && (
            <div className="mx-auto mt-5 flex max-w-md justify-center gap-6 text-center text-xs">
              <ScoreCell label="Pre-test" value={pre} />
              <ScoreCell label="Post-test" value={post} highlight />
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

        <footer className="mt-4 grid grid-cols-2 gap-10 px-6 text-center text-xs">
          <div>
            <div className="text-atr-fg-muted">Mengetahui,</div>
            <div className="mt-10 border-t border-atr-fg pt-1 font-bold text-atr-fg">
              {project.organization?.name ?? "Mitra Penyelenggara"}
            </div>
          </div>
          <div>
            <div className="text-atr-fg-muted">Atourin Mentor</div>
            <div className="mt-10 border-t border-atr-fg pt-1 font-bold text-atr-fg">
              Tim Atourin
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
          Peserta belum memenuhi syarat sertifikat (Post-test ≥70 + improvement
          ≥20%). Sertifikat tetap bisa di-print untuk preview.
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
