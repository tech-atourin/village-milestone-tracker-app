"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import type { RaporRow } from "@/server/queries/rapor";
import {
  hitungNilaiAkhir,
  resolveGradingConfig,
  type GradingConfig,
} from "@/lib/rapor/scoring";

function effective(row: RaporRow) {
  const pre = row.pre_test_score ?? row.auto_pre_test_score ?? null;
  const post = row.post_test_score ?? row.auto_post_test_score ?? null;
  return { pre, post };
}

export function RaporCetakBatch({
  projectId,
  projectName,
  rows,
  gradingConfig,
}: {
  projectId: string;
  projectName: string;
  rows: RaporRow[];
  gradingConfig?: Partial<GradingConfig> | null;
}) {
  const { passing_score } = resolveGradingConfig(gradingConfig);

  const batchOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.batch_name) set.add(r.batch_name);
    return Array.from(set).sort();
  }, [rows]);

  const [batch, setBatch] = useState<string>(
    () => batchOptions[0] ?? "",
  );

  const visible = useMemo(() => {
    const filtered = batch
      ? rows.filter((r) => r.batch_name === batch)
      : rows.filter((r) => !r.batch_name);
    return [...filtered].sort((a, b) =>
      a.full_name.localeCompare(b.full_name),
    );
  }, [rows, batch]);

  const computed = visible.map((r) => {
    const { pre, post } = effective(r);
    const final = hitungNilaiAkhir(
      {
        pre_test_score: pre,
        post_test_score: post,
        tugas_score: r.tugas_score,
        keaktifan_score: r.keaktifan_score,
      },
      gradingConfig,
    );
    return { row: r, pre, post, final };
  });

  const lulus = computed.filter(
    (c) => c.final != null && c.final >= passing_score,
  ).length;
  const withFinal = computed.filter((c) => c.final != null).length;
  const avgFinal =
    withFinal > 0
      ? Math.round(
          computed.reduce((s, c) => s + (c.final ?? 0), 0) / withFinal,
        )
      : null;

  const tanggal = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-5">
      {/* Toolbar (hidden on print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/atourin/projects/${projectId}/rapor`}
          className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Rapor
        </Link>
        <div className="flex items-center gap-2">
          {batchOptions.length > 0 && (
            <select
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              aria-label="Pilih batch"
              className="h-10 rounded-lg border border-atr-outline bg-white px-3 text-sm font-medium text-atr-fg outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            >
              {batchOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="">Tanpa batch</option>
            </select>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600"
          >
            <Printer className="h-4 w-4" />
            Cetak / PDF
          </button>
        </div>
      </div>

      {/* Printable sheet */}
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-atr-outline bg-white p-8 shadow-atr-1 print:border-0 print:shadow-none">
        <header className="border-b border-atr-outline pb-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-atr-purple">
            Laporan Rapor per Gelombang
          </div>
          <h1 className="mt-1 text-xl font-bold text-atr-fg">{projectName}</h1>
          <p className="mt-0.5 text-sm text-atr-fg-muted">
            {batch ? `Gelombang: ${batch}` : "Peserta tanpa batch"} · Dicetak{" "}
            {tanggal}
          </p>
        </header>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <SummaryCell label="Jumlah peserta" value={String(visible.length)} />
          <SummaryCell
            label="Lulus"
            value={`${lulus}/${withFinal}`}
            hint={`Batas lulus ${passing_score}`}
          />
          <SummaryCell
            label="Rata-rata nilai akhir"
            value={avgFinal != null ? String(avgFinal) : "-"}
          />
        </div>

        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-atr-outline text-left text-[11px] font-bold uppercase tracking-wide text-atr-fg-muted">
              <th className="py-2 pr-2">No</th>
              <th className="py-2 pr-2">Nama</th>
              <th className="py-2 pr-2">Desa</th>
              <th className="py-2 pr-2 text-center">Pre</th>
              <th className="py-2 pr-2 text-center">Post</th>
              <th className="py-2 pr-2 text-center">Δ</th>
              <th className="py-2 pr-2 text-center">Nilai Akhir</th>
              <th className="py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {computed.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 text-center text-sm text-atr-fg-muted"
                >
                  Belum ada peserta pada gelombang ini.
                </td>
              </tr>
            ) : (
              computed.map((c, i) => {
                const delta =
                  c.pre != null && c.post != null ? c.post - c.pre : null;
                const passed = c.final != null && c.final >= passing_score;
                return (
                  <tr
                    key={c.row.user_id}
                    className="border-b border-atr-outline/60"
                  >
                    <td className="py-2 pr-2 text-atr-fg-muted">{i + 1}</td>
                    <td className="py-2 pr-2 font-medium text-atr-fg">
                      {c.row.full_name}
                    </td>
                    <td className="py-2 pr-2 text-atr-fg-muted">
                      {c.row.desa_name ?? "-"}
                    </td>
                    <td className="py-2 pr-2 text-center tabular-nums">
                      {c.pre ?? "-"}
                    </td>
                    <td className="py-2 pr-2 text-center tabular-nums">
                      {c.post ?? "-"}
                    </td>
                    <td className="py-2 pr-2 text-center tabular-nums">
                      {delta != null
                        ? `${delta > 0 ? "+" : ""}${delta}`
                        : "-"}
                    </td>
                    <td className="py-2 pr-2 text-center font-bold tabular-nums text-atr-fg">
                      {c.final != null ? c.final : "-"}
                    </td>
                    <td className="py-2 text-center">
                      {c.final == null ? (
                        <span className="text-xs text-atr-fg-muted">
                          Belum lengkap
                        </span>
                      ) : passed ? (
                        <span className="text-xs font-bold text-atr-arti">
                          Lulus
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-atr-red">
                          Belum lulus
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <footer className="mt-8 flex justify-end">
          <div className="text-center text-xs text-atr-fg-muted">
            <div className="mb-12">Mengetahui,</div>
            <div className="border-t border-atr-fg/40 px-8 pt-1">
              Penanggung Jawab Program
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-atr-outline bg-atr-bg-soft/50 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-bold text-atr-fg">{value}</div>
      {hint && <div className="text-[10px] text-atr-fg-muted">{hint}</div>}
    </div>
  );
}
