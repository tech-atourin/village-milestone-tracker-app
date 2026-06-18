import Image from "next/image";
import { getProject } from "@/server/queries/projects";
import { listProjectDesa } from "@/server/queries/desa";
import { listProjectTopikWithItems } from "@/server/queries/topik";
import { generateDesaSummary, type DesaSummary } from "@/lib/ai/desa-summary";
import { aiProvider } from "@/lib/ai/provider";
import { createAdminClient } from "@/lib/supabase/server";

async function tryGetSummary(
  projectDesaId: string,
): Promise<DesaSummary | null> {
  if (!aiProvider().isReady()) return null;
  const r = await generateDesaSummary(projectDesaId);
  return r.data ?? null;
}

/**
 * Shared printable Final Report body. Used by both
 * /atourin/projects/[id]/report and /mitra/projects/[id]/report.
 * Caller is responsible for auth + ownership checks.
 */
export async function ReportBody({
  projectId,
  aiOn,
}: {
  projectId: string;
  aiOn: boolean;
}) {
  const project = await getProject(projectId);
  if (!project) return null;
  const desa = await listProjectDesa(projectId);
  const topik = await listProjectTopikWithItems(projectId);
  const aiActuallyOn = aiOn && aiProvider().isReady();

  // Per-topik completion across desa - fix the bug where every topik used to
  // show the same project-wide average. We join desa_topik_instance back to
  // project_topik so each topik's pct is the mean of its instances.
  const admin = createAdminClient();
  const { data: instancesRaw } = await admin
    .from("desa_topik_instance")
    .select(
      "completion_percent, project_topik:project_topik!inner(id, project_id)",
    )
    .eq("project_topik.project_id", projectId);
  const topikAggByPt = new Map<string, { sum: number; count: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (instancesRaw ?? []) as any[]) {
    const ptId = r.project_topik?.id as string | undefined;
    if (!ptId) continue;
    const cur = topikAggByPt.get(ptId) ?? { sum: 0, count: 0 };
    cur.sum += Number(r.completion_percent ?? 0);
    cur.count += 1;
    topikAggByPt.set(ptId, cur);
  }

  // Kuisioner narasumber - project-wide avg + per-narasumber breakdown
  const { data: ratingRows } = await admin
    .from("narasumber_ratings")
    .select(
      "narasumber_id, rating, narasumber:users!narasumber_ratings_narasumber_id_fkey(full_name)",
    )
    .eq("project_id", projectId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ratingArr = ((ratingRows ?? []) as any[]) as Array<{
    narasumber_id: string;
    rating: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    narasumber: any;
  }>;
  const ratingAvg =
    ratingArr.length > 0
      ? ratingArr.reduce((a, r) => a + r.rating, 0) / ratingArr.length
      : null;
  const ratingsByNs = new Map<
    string,
    { name: string; sum: number; count: number }
  >();
  for (const r of ratingArr) {
    const cur = ratingsByNs.get(r.narasumber_id) ?? {
      name: r.narasumber?.full_name ?? "Narasumber",
      sum: 0,
      count: 0,
    };
    cur.sum += r.rating;
    cur.count += 1;
    ratingsByNs.set(r.narasumber_id, cur);
  }
  const topNarasumber = Array.from(ratingsByNs.values())
    .map((v) => ({
      name: v.name,
      avg: v.sum / v.count,
      count: v.count,
    }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count);

  // Rencana aksi summary
  const projectDesaIds = desa.map((d) => d.id);
  const apStatus = { rencana: 0, on_track: 0, selesai: 0, ditunda: 0 };
  if (projectDesaIds.length > 0) {
    const { data: apRows } = await admin
      .from("desa_action_plans")
      .select("status")
      .in("project_desa_id", projectDesaIds);
    for (const r of (apRows ?? []) as Array<{ status: keyof typeof apStatus }>) {
      if (apStatus[r.status] !== undefined) apStatus[r.status] += 1;
    }
  }
  const actionPlansTotal =
    apStatus.rencana + apStatus.on_track + apStatus.selesai + apStatus.ditunda;

  // Peserta + narasumber counts for the executive summary.
  const { data: pesertaRows } = await admin
    .from("project_memberships")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("role", "peserta")
    .eq("status", "active");
  const pesertaCount = new Set(
    ((pesertaRows ?? []) as Array<{ user_id: string }>).map((r) => r.user_id),
  ).size;
  const narasumberCount = new Set(
    ratingArr.map((r) => r.narasumber_id),
  ).size;

  const summaries: Record<string, DesaSummary | null> = {};
  if (aiActuallyOn) {
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
          &quot;Save as PDF&quot;.{" "}
          {aiActuallyOn
            ? "AI summary aktif."
            : "Tambah ?ai=1 di URL untuk include AI summary per desa."}
        </span>
        {!aiActuallyOn && aiProvider().isReady() && (
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
          {project.period_start} – {project.period_end}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
          Ringkasan Eksekutif
        </h2>
        {project.description && (
          <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-atr-fg">
            {project.description}
          </p>
        )}
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          <Kpi
            label="Progress overall"
            value={`${Math.round(overall)}%`}
            tone="purple"
          />
          <Kpi
            label="Desa terlibat"
            value={desa.length.toString()}
            tone="green"
          />
          <Kpi
            label="Peserta"
            value={pesertaCount.toString()}
            tone="purple-soft"
          />
          <Kpi
            label="Narasumber"
            value={narasumberCount.toString()}
            tone="yellow"
          />
          <Kpi label="Topik" value={topik.length.toString()} tone="muted" />
          <Kpi
            label="Checklist items"
            value={topik.reduce((a, t) => a + t.items.length, 0).toString()}
            tone="muted"
          />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
          Performa per Topik
        </h2>
        <div className="space-y-2">
          {topik.map((t) => {
            const agg = topikAggByPt.get(t.id);
            const avg = agg && agg.count > 0 ? agg.sum / agg.count : 0;
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
                    .join(", ") || "-"}
                </td>
                <td className="py-2 text-right font-bold text-atr-fg">
                  {Math.round(d.topik_summary.avg_pct)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Kuisioner Narasumber */}
      {ratingArr.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            Kuisioner Narasumber
          </h2>
          <p className="mb-3 text-sm text-atr-fg">
            Rata-rata penilaian peserta ke narasumber:{" "}
            <strong>
              ★ {ratingAvg != null ? ratingAvg.toFixed(2) : "-"}
            </strong>{" "}
            dari {ratingArr.length} penilaian.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-atr-outline text-xs text-atr-fg-muted">
                <th className="py-2 text-left">Narasumber</th>
                <th className="py-2 text-right">Penilaian</th>
                <th className="py-2 text-right">Rating</th>
              </tr>
            </thead>
            <tbody>
              {topNarasumber.map((n) => (
                <tr key={n.name} className="border-b border-atr-outline/50">
                  <td className="py-2 font-bold text-atr-fg">{n.name}</td>
                  <td className="py-2 text-right text-atr-fg-muted">
                    {n.count}
                  </td>
                  <td className="py-2 text-right font-bold text-atr-fg">
                    ★ {n.avg.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Rencana Aksi */}
      {actionPlansTotal > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            Rencana Aksi Tindak Lanjut
          </h2>
          <p className="mb-3 text-sm text-atr-fg">
            Total {actionPlansTotal} rencana aksi dari peserta &amp;
            narasumber. {apStatus.selesai} sudah selesai, {apStatus.on_track}{" "}
            on-track, {apStatus.rencana} masih rencana, {apStatus.ditunda}{" "}
            ditunda.
          </p>
          <div className="grid grid-cols-4 gap-3 text-center text-xs">
            <ReportStat
              label="Rencana"
              value={String(apStatus.rencana)}
              tone="muted"
            />
            <ReportStat
              label="On Track"
              value={String(apStatus.on_track)}
              tone="purple-soft"
            />
            <ReportStat
              label="Selesai"
              value={String(apStatus.selesai)}
              tone="green"
            />
            <ReportStat
              label="Ditunda"
              value={String(apStatus.ditunda)}
              tone="yellow"
            />
          </div>
        </section>
      )}

      {aiActuallyOn &&
        desa.map((d) => {
          const s = summaries[d.id];
          if (!s) return null;
          return (
            <section
              key={d.id}
              className="page-break mb-10 rounded-2xl border border-atr-purple/20 p-6"
            >
              <h3 className="mb-3 text-base font-bold text-atr-fg">
                Insight AI · {d.desa.name}
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

type Tone =
  | "purple"
  | "purple-soft"
  | "green"
  | "yellow"
  | "muted"
  | "red";

const TONE_STYLES: Record<Tone, { card: string; value: string }> = {
  purple: {
    card: "border-atr-purple/40 bg-atr-purple-50",
    value: "text-atr-purple-600",
  },
  "purple-soft": {
    card: "border-atr-purple/20 bg-atr-purple-50/40",
    value: "text-atr-purple-600",
  },
  green: { card: "border-atr-arti/30 bg-atr-arti/10", value: "text-atr-arti" },
  yellow: {
    card: "border-atr-yellow/40 bg-atr-yellow/15",
    value: "text-atr-fg",
  },
  muted: {
    card: "border-atr-outline bg-atr-bg-soft/40",
    value: "text-atr-fg",
  },
  red: { card: "border-atr-red/30 bg-atr-red/5", value: "text-atr-red" },
};

function ReportStat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  const s = TONE_STYLES[tone];
  return (
    <div className={`rounded-lg border p-3 shadow-sm ${s.card}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className={`mt-1 text-xl font-bold ${s.value}`}>{value}</div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  const s = TONE_STYLES[tone];
  return (
    <div className={`rounded-xl border p-3 text-center shadow-sm ${s.card}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className={`mt-1 text-xl font-bold ${s.value}`}>{value}</div>
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
