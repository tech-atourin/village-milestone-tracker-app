import Image from "next/image";
import type { RaporDesaDetail } from "@/server/queries/rapor-desa";

const ELIGIBILITY_THRESHOLD = 60;

const TIER_LABEL: Record<string, string> = {
  unclassified: "Belum Diklasifikasi",
  rintisan: "Rintisan",
  berkembang: "Berkembang",
  maju: "Maju",
  mandiri: "Mandiri",
};

export function SertifikatDesaView({ data }: { data: RaporDesaDetail }) {
  const { project, desa, aggregate } = data;
  const checklist = Math.round(aggregate.checklist_completion_pct ?? 0);
  const eligible = checklist >= ELIGIBILITY_THRESHOLD;
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

      <div className="no-print mb-6 rounded-lg border border-atr-outline bg-atr-bg-soft p-3 text-xs text-atr-fg-muted">
        <strong className="text-atr-fg">Tips:</strong> Cetak (Ctrl/⌘+P) → pilih
        layout <strong>landscape</strong> + ukuran A4 → Save as PDF.
        {!eligible && (
          <span className="ml-2 rounded-md bg-atr-yellow/20 px-1.5 py-0.5 font-bold text-atr-fg">
            Catatan: progress checklist {checklist}% belum mencapai ambang
            ({ELIGIBILITY_THRESHOLD}%). Sertifikat tetap bisa dicetak sebagai
            tanda partisipasi.
          </span>
        )}
      </div>

      <article className="print-frame relative mx-auto aspect-[1.414/1] w-full max-w-[1100px] overflow-hidden border-[12px] border-double border-atr-purple/40 bg-gradient-to-br from-atr-purple-50/60 to-white p-10 shadow-atr-3">
        <div className="absolute left-0 top-0 h-24 w-24 border-l-4 border-t-4 border-atr-yellow" />
        <div className="absolute right-0 top-0 h-24 w-24 border-r-4 border-t-4 border-atr-yellow" />
        <div className="absolute bottom-0 left-0 h-24 w-24 border-b-4 border-l-4 border-atr-yellow" />
        <div className="absolute bottom-0 right-0 h-24 w-24 border-b-4 border-r-4 border-atr-yellow" />

        <header className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo/vmt/vmt-app-icon.svg"
              alt="VMT"
              width={48}
              height={48}
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
                {project.organization?.name ?? "Atourin"}
              </div>
            </div>
          )}
        </header>

        <div className="mt-8 text-center">
          <h1 className="text-sm font-bold uppercase tracking-[0.25em] text-atr-purple-600">
            Sertifikat Pendampingan Desa Wisata
          </h1>
          <p className="mt-2 text-xs uppercase tracking-widest text-atr-fg-muted">
            Diberikan kepada
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-atr-fg">
            {desa.name}
          </h2>
          <p className="mt-2 text-sm text-atr-fg-muted">
            {[desa.kabupaten, desa.provinsi].filter(Boolean).join(", ") || "-"}
            {desa.current_classification && (
              <>
                {" · Klasifikasi: "}
                <strong className="text-atr-fg">
                  {TIER_LABEL[desa.current_classification] ??
                    desa.current_classification}
                </strong>
              </>
            )}
          </p>

          <p className="mx-auto mt-8 max-w-2xl text-sm leading-relaxed text-atr-fg">
            Atas {eligible ? "pencapaian dan komitmen" : "partisipasi"} dalam
            program
            <br />
            <strong className="text-atr-purple-600">{project.name}</strong>
            <br />
            periode {dateFmt(project.period_start)} – {dateFmt(project.period_end)}.
          </p>

          <div className="mx-auto mt-6 flex max-w-md justify-center gap-6 text-center text-xs">
            <ScoreCell label="Peserta" value={aggregate.peserta_count} />
            <ScoreCell
              label="Progress Materi"
              value={`${checklist}%`}
              highlight
            />
            {aggregate.avg_improvement != null && (
              <ScoreCell
                label="Peningkatan"
                value={`${aggregate.avg_improvement > 0 ? "+" : ""}${
                  aggregate.avg_improvement
                }%`}
                emphasis={eligible ? "green" : "muted"}
              />
            )}
          </div>
        </div>

        <footer className="absolute bottom-10 left-10 right-10 grid grid-cols-2 gap-10 text-center text-xs">
          <div>
            <div className="text-atr-fg-muted">Mengetahui,</div>
            <div className="mt-12 border-t border-atr-fg pt-1 font-bold text-atr-fg">
              {project.organization?.name ?? "Mitra Penyelenggara"}
            </div>
          </div>
          <div>
            <div className="text-atr-fg-muted">Atourin Mentor</div>
            <div className="mt-12 border-t border-atr-fg pt-1 font-bold text-atr-fg">
              Tim Atourin
            </div>
          </div>
        </footer>

        <div className="absolute bottom-2 left-0 right-0 text-center text-[9px] uppercase tracking-widest text-atr-fg-muted">
          Diterbitkan {dateFmt(new Date().toISOString())} · ID{" "}
          {desa.id?.slice(0, 8) ?? "-"}-{project.id?.slice(0, 8) ?? "-"}
        </div>
      </article>
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
  emphasis?: "green" | "muted";
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
