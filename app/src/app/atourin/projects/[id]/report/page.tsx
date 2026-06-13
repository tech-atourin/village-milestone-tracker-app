export const metadata = { title: "Laporan Project" };

import { notFound } from "next/navigation";
import Image from "next/image";
import { requireRole } from "@/lib/auth/rbac";
import { getProject } from "@/server/queries/projects";
import { listProjectDesa } from "@/server/queries/desa";
import { listProjectTopikWithItems } from "@/server/queries/topik";
import { generateDesaSummary, type DesaSummary } from "@/lib/ai/desa-summary";
import { aiProvider } from "@/lib/ai/provider";

async function tryGetSummary(
  projectDesaId: string,
): Promise<DesaSummary | null> {
  if (!aiProvider().isReady()) return null;
  const r = await generateDesaSummary(projectDesaId);
  return r.data ?? null;
}

export default async function FinalReportPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { ai?: string };
}) {
  await requireRole("superadmin");
  const project = await getProject(params.id);
  if (!project) notFound();

  const desa = await listProjectDesa(params.id);
  const topik = await listProjectTopikWithItems(params.id);
  const aiOn = searchParams.ai === "1" && aiProvider().isReady();

  const summaries: Record<string, DesaSummary | null> = {};
  if (aiOn) {
    for (const pd of desa) {
      summaries[pd.id] = await tryGetSummary(pd.id);
    }
  }

  const overall =
    desa.length > 0
      ? desa.reduce((acc, d) => acc + d.topik_summary.avg_pct, 0) / desa.length
      : 0;

  return (
    <main className="mx-auto max-w-4xl bg-white p-8 print:p-0">
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { size: A4; margin: 18mm; }
              .no-print { display: none !important; }
              .page-break { break-before: page; }
            }
          `,
        }}
      />

      <div className="no-print mb-6 flex items-center justify-between rounded-lg border border-atr-outline bg-atr-bg-soft p-3 text-xs text-atr-fg-muted">
        <span>
          <strong className="text-atr-fg">Tips:</strong> Cetak (Ctrl/⌘+P) atau
          &quot;Save as PDF&quot;. {aiOn ? "AI summary aktif." : "Tambah ?ai=1 di URL untuk include AI summary per desa."}
        </span>
        {!aiOn && aiProvider().isReady() && (
          <a
            href={`?ai=1`}
            className="font-bold text-atr-purple hover:underline"
          >
            Aktifkan AI summary →
          </a>
        )}
      </div>

      {/* Cover */}
      <section className="mb-12 flex flex-col items-center justify-center border-b border-atr-outline pb-12 text-center">
        {project.organization?.name && (
          // eslint-disable-next-line @next/next/no-img-element
          <div className="text-sm font-bold uppercase tracking-wide text-atr-purple">
            {project.organization.name} × Atourin
          </div>
        )}
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-atr-fg">
          {project.name}
        </h1>
        <p className="mt-3 text-sm text-atr-fg-muted">
          Laporan akhir program pendampingan
        </p>
        <p className="mt-2 text-xs text-atr-fg-muted">
          {project.period_start} — {project.period_end}
        </p>
      </section>

      {/* Executive summary */}
      <section className="mb-10">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
          Ringkasan Eksekutif
        </h2>
        {project.description && (
          <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-atr-fg">
            {project.description}
          </p>
        )}
        <div className="grid grid-cols-4 gap-4">
          <Kpi label="Progress overall" value={`${Math.round(overall)}%`} />
          <Kpi label="Desa terlibat" value={desa.length.toString()} />
          <Kpi label="Topik" value={topik.length.toString()} />
          <Kpi
            label="Checklist items"
            value={topik
              .reduce((a, t) => a + t.items.length, 0)
              .toString()}
          />
        </div>
      </section>

      {/* Per topik */}
      <section className="mb-10">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
          Performa per Topik
        </h2>
        <div className="space-y-2">
          {topik.map((t) => {
            const avg =
              desa.length > 0
                ? desa.reduce((a, d) => a + d.topik_summary.avg_pct, 0) /
                  desa.length
                : 0;
            return (
              <div key={t.id} className="text-sm">
                <div className="flex justify-between">
                  <span className="font-bold text-atr-fg">{t.name}</span>
                  <span className="text-atr-fg-muted">
                    {Math.round(avg)}% · {t.items.length} item
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-atr-bg-soft">
                  <div
                    className="h-full bg-atr-purple"
                    style={{ width: `${Math.round(avg)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Per desa */}
      <section className="mb-10">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
          Performa per Desa
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-atr-outline text-xs text-atr-fg-muted">
              <th className="py-2 text-left">Desa</th>
              <th className="py-2 text-left">Lokasi</th>
              <th className="py-2 text-right">Progress</th>
            </tr>
          </thead>
          <tbody>
            {desa.map((d) => (
              <tr key={d.id} className="border-b border-atr-outline/50">
                <td className="py-2 font-bold text-atr-fg">{d.desa.name}</td>
                <td className="py-2 text-atr-fg-muted">
                  {[d.desa.kabupaten, d.desa.provinsi]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </td>
                <td className="py-2 text-right font-bold text-atr-fg">
                  {Math.round(d.topik_summary.avg_pct)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* AI summaries per desa */}
      {aiOn &&
        desa.map((d) => {
          const s = summaries[d.id];
          if (!s) return null;
          return (
            <section
              key={d.id}
              className="page-break mb-10 rounded-2xl border border-atr-purple/20 p-6"
            >
              <h3 className="mb-3 text-base font-bold text-atr-fg">
                Insight AI — {d.desa.name}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-atr-fg">
                {s.overview}
              </p>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <AiList label="Highlights" items={s.highlights} />
                <AiList label="Area didorong" items={s.areas_to_push} />
                <AiList label="Quick wins" items={s.quick_wins} />
              </div>
            </section>
          );
        })}

      {/* Footer */}
      <footer className="mt-16 grid grid-cols-2 gap-12 border-t border-atr-outline pt-8 text-xs">
        <div className="text-center">
          <div className="text-atr-fg-muted">Mengetahui,</div>
          <div className="mt-16 border-t border-atr-fg pt-1 font-bold text-atr-fg">
            {project.organization?.name ?? "Mitra"}
          </div>
        </div>
        <div className="text-center">
          <div className="text-atr-fg-muted">Disiapkan oleh,</div>
          <div className="mt-16 border-t border-atr-fg pt-1 font-bold text-atr-fg">
            Tim Atourin
          </div>
        </div>
      </footer>

      <div className="mt-8 flex items-center justify-between text-[10px] text-atr-fg-muted">
        <span>
          Generated{" "}
          {new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
        <div className="flex items-center gap-2">
          <Image
            src="/logo/vmt/vmt-mark.svg"
            alt="VMT"
            width={20}
            height={20}
          />
          <span className="font-bold">Village Milestone Tracker</span>
        </div>
      </div>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-atr-outline p-3 text-center">
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-atr-fg">{value}</div>
    </div>
  );
}

function AiList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-atr-fg">
            • {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
