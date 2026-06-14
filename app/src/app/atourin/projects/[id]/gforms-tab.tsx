"use client";

import { useState, useMemo } from "react";
import {
  Inbox,
  FileSpreadsheet,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { GformsPanel, type GformRow } from "./gforms-panel";

export type TestResultRow = {
  id: string;
  project_gform_id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  form_type: "pre_test" | "post_test" | "survey_kepuasan" | "survey_lainnya";
  form_label: string | null;
  raw_response: Record<string, unknown>;
  score: number | null;
  max_score: number | null;
  submitted_at: string | null;
  matched_status: "matched" | "unmatched" | "ambiguous";
};

const FORM_TYPE_LABEL: Record<string, string> = {
  pre_test: "Pre-test",
  post_test: "Post-test",
  survey_kepuasan: "Survey Kepuasan",
  survey_lainnya: "Survey Lainnya",
};

const FORM_TYPE_COLOR: Record<string, string> = {
  pre_test: "bg-atr-yellow/20 text-atr-fg",
  post_test: "bg-atr-arti/15 text-atr-arti",
  survey_kepuasan: "bg-atr-purple-50 text-atr-purple-600",
  survey_lainnya: "bg-atr-bg-soft text-atr-fg-muted",
};

const PAGE_SIZE = 25;

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function GformsTab({
  projectId,
  gforms,
  testResults,
}: {
  projectId: string;
  gforms: GformRow[];
  testResults: TestResultRow[];
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [matchFilter, setMatchFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return testResults.filter((r) => {
      if (typeFilter !== "all" && r.form_type !== typeFilter) return false;
      if (matchFilter !== "all" && r.matched_status !== matchFilter) return false;
      if (q) {
        const hay = `${r.user_name ?? ""} ${r.user_email ?? ""} ${JSON.stringify(r.raw_response)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [testResults, search, typeFilter, matchFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const effectivePage = Math.min(page, totalPages);
  const start = (effectivePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  const stats = useMemo(() => {
    const matched = testResults.filter((r) => r.matched_status === "matched").length;
    const unmatched = testResults.filter((r) => r.matched_status === "unmatched").length;
    const ambiguous = testResults.filter((r) => r.matched_status === "ambiguous").length;
    const byType: Record<string, number> = {};
    for (const r of testResults) byType[r.form_type] = (byType[r.form_type] ?? 0) + 1;
    return { total: testResults.length, matched, unmatched, ambiguous, byType };
  }, [testResults]);

  return (
    <div className="space-y-6">
      {/* Section 1: GForm config */}
      <GformsPanel projectId={projectId} gforms={gforms} />

      {/* Section 2: Test Results */}
      <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1 space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-atr-purple" />
            <h3 className="text-sm font-bold text-atr-fg">
              Hasil Sync ({testResults.length})
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-atr-fg-muted">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-atr-arti" />
              {stats.matched} matched
            </span>
            <span className="inline-flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-atr-yellow" />
              {stats.unmatched} unmatched
            </span>
          </div>
        </header>

        {testResults.length === 0 ? (
          <div className="rounded-lg border border-dashed border-atr-outline bg-atr-bg-soft p-8 text-center">
            <Inbox className="mx-auto mb-2 h-6 w-6 text-atr-fg-muted" />
            <p className="text-sm font-bold text-atr-fg">
              Belum ada hasil sync
            </p>
            <p className="mt-1 text-xs text-atr-fg-muted">
              Jalankan sync di section atas. Data submission Google Form akan tampil di sini setelah sync berhasil.
            </p>
          </div>
        ) : (
          <>
            {/* Filter bar */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-atr-fg-muted" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari nama, email, atau jawaban..."
                  className="h-10 w-full rounded-md border border-atr-outline bg-white pl-9 pr-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
              >
                <option value="all">Semua Jenis ({stats.total})</option>
                {Object.entries(stats.byType).map(([k, v]) => (
                  <option key={k} value={k}>
                    {FORM_TYPE_LABEL[k] ?? k} ({v})
                  </option>
                ))}
              </select>
              <select
                value={matchFilter}
                onChange={(e) => {
                  setMatchFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
              >
                <option value="all">Semua Status ({stats.total})</option>
                <option value="matched">Matched ({stats.matched})</option>
                <option value="unmatched">Unmatched ({stats.unmatched})</option>
                <option value="ambiguous">Ambiguous ({stats.ambiguous})</option>
              </select>
            </div>

            <p className="text-xs text-atr-fg-muted">
              Menampilkan {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} dari {filtered.length} hasil
            </p>

            {/* Table */}
            <div className="overflow-hidden rounded-lg border border-atr-outline">
              <table className="w-full text-sm">
                <thead className="bg-atr-bg-soft text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  <tr>
                    <th className="px-3 py-2">Jenis</th>
                    <th className="px-3 py-2">Peserta</th>
                    <th className="px-3 py-2">Skor</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Submitted</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-atr-outline">
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-12 text-center text-sm italic text-atr-fg-muted">
                        Tidak ada hasil sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((r) => {
                      const isExpanded = expandedId === r.id;
                      return (
                        <>
                          <tr key={r.id} className="hover:bg-atr-bg-soft">
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${FORM_TYPE_COLOR[r.form_type]}`}
                              >
                                {FORM_TYPE_LABEL[r.form_type]}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {r.user_name ? (
                                <>
                                  <div className="font-bold text-atr-fg">{r.user_name}</div>
                                  {r.user_email && (
                                    <div className="text-[11px] text-atr-fg-muted">{r.user_email}</div>
                                  )}
                                </>
                              ) : (
                                <span className="italic text-atr-fg-muted">
                                  {(r.raw_response["Email Address"] as string) ?? "—"}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 font-bold text-atr-fg">
                              {r.score != null ? (
                                <>
                                  {r.score}
                                  {r.max_score && (
                                    <span className="text-xs font-normal text-atr-fg-muted"> / {r.max_score}</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs italic text-atr-fg-muted">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {r.matched_status === "matched" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-atr-arti/15 px-2 py-0.5 text-[10px] font-bold text-atr-arti">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  Matched
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-atr-yellow/20 px-2 py-0.5 text-[10px] font-bold text-atr-fg">
                                  <AlertCircle className="h-2.5 w-2.5" />
                                  {r.matched_status === "unmatched" ? "Unmatched" : "Ambiguous"}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-atr-fg-muted">
                              {fmtDate(r.submitted_at)}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : r.id)}
                                className="rounded-md p-1 text-atr-fg-muted hover:bg-atr-bg-soft hover:text-atr-fg"
                                aria-label={isExpanded ? "Tutup" : "Lihat detail"}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${r.id}-detail`}>
                              <td colSpan={6} className="bg-atr-bg-soft px-3 py-3">
                                <div className="rounded-lg border border-atr-outline bg-white p-3">
                                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
                                    Raw Response dari Google Sheet
                                  </div>
                                  <dl className="space-y-1.5 text-xs">
                                    {Object.entries(r.raw_response).map(([k, v]) => (
                                      <div key={k} className="grid grid-cols-3 gap-3">
                                        <dt className="font-bold text-atr-fg">{k}</dt>
                                        <dd className="col-span-2 whitespace-pre-wrap text-atr-fg-muted">
                                          {typeof v === "string" ? v : JSON.stringify(v)}
                                        </dd>
                                      </div>
                                    ))}
                                  </dl>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={effectivePage === 1}
                  className="inline-flex h-9 items-center gap-1 rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Sebelumnya
                </button>
                <span className="text-xs text-atr-fg-muted">
                  Halaman <strong className="text-atr-fg">{effectivePage}</strong> dari {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={effectivePage === totalPages}
                  className="inline-flex h-9 items-center gap-1 rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft disabled:opacity-40"
                >
                  Selanjutnya
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
