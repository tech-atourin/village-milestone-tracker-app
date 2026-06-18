"use client";

import { useMemo, useState } from "react";
import {
  Inbox,
  FileSpreadsheet,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  GraduationCap,
  ClipboardCheck,
  Smile,
} from "lucide-react";
import { GformsPanel, type GformRow } from "./gforms-panel";

export type TestResultRow = {
  id: string;
  project_gform_id: string;
  project_topik_id: string | null;
  project_topik_name: string | null;
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

export type NarasumberRatingRow = {
  id: string;
  narasumber_id: string;
  narasumber_name: string;
  rater_id: string | null;
  rater_name: string | null;
  rater_email: string | null;
  rating: number;
  comment: string | null;
  submitted_at: string;
};

type ChipKey = "pre_test" | "post_test" | "survey_kepuasan" | "kuisioner_narasumber";

const CHIP_LABEL: Record<ChipKey, string> = {
  pre_test: "Pre-test",
  post_test: "Post-test",
  survey_kepuasan: "Survey Kepuasan",
  kuisioner_narasumber: "Kuisioner Narasumber",
};

const CHIP_ICON: Record<ChipKey, React.ComponentType<{ className?: string }>> = {
  pre_test: ClipboardCheck,
  post_test: ClipboardCheck,
  survey_kepuasan: Smile,
  kuisioner_narasumber: GraduationCap,
};

const PAGE_SIZE = 25;

function fmtDate(iso: string | null) {
  if (!iso) return "-";
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
  narasumberRatings,
}: {
  projectId: string;
  gforms: GformRow[];
  testResults: TestResultRow[];
  narasumberRatings: NarasumberRatingRow[];
}) {
  const counts = useMemo(() => {
    const out: Record<ChipKey, number> = {
      pre_test: 0,
      post_test: 0,
      survey_kepuasan: 0,
      kuisioner_narasumber: narasumberRatings.length,
    };
    for (const r of testResults) {
      if (r.form_type === "pre_test") out.pre_test += 1;
      else if (r.form_type === "post_test") out.post_test += 1;
      else if (r.form_type === "survey_kepuasan") out.survey_kepuasan += 1;
    }
    return out;
  }, [testResults, narasumberRatings.length]);

  // Default to first chip with data (else Pre-test).
  const initialChip: ChipKey =
    (["pre_test", "post_test", "survey_kepuasan", "kuisioner_narasumber"] as ChipKey[]).find(
      (k) => counts[k] > 0,
    ) ?? "pre_test";
  const [active, setActive] = useState<ChipKey>(initialChip);

  return (
    <div className="space-y-6">
      {/* Section 1: GForm config */}
      <GformsPanel projectId={projectId} gforms={gforms} />

      {/* Section 2: Test Results - chip nav per jenis */}
      <section className="space-y-4 rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
        <header className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-atr-purple" />
          <h3 className="text-sm font-bold text-atr-fg">
            Hasil Sync per Jenis
          </h3>
        </header>

        <nav className="flex flex-wrap gap-2">
          {(Object.keys(CHIP_LABEL) as ChipKey[]).map((k) => {
            const Icon = CHIP_ICON[k];
            const isActive = active === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setActive(k)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition ${
                  isActive
                    ? "border-atr-purple bg-atr-purple text-white"
                    : "border-atr-outline bg-white text-atr-fg-muted hover:text-atr-fg"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {CHIP_LABEL[k]} · {counts[k]}
              </button>
            );
          })}
        </nav>

        {active === "kuisioner_narasumber" ? (
          <NarasumberRatingTable rows={narasumberRatings} />
        ) : (
          <FormResultsTable
            rows={testResults.filter((r) => r.form_type === active)}
            jenis={active}
          />
        )}
      </section>
    </div>
  );
}

// =====================================================
// Sub-component: pre-test / post-test / survey kepuasan
// =====================================================
function FormResultsTable({
  rows,
  jenis,
}: {
  rows: TestResultRow[];
  jenis: "pre_test" | "post_test" | "survey_kepuasan";
}) {
  const [search, setSearch] = useState("");
  const [matchFilter, setMatchFilter] = useState<string>("all");
  const [materiFilter, setMateriFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const materiOptions = useMemo(() => {
    const map = new Map<string, string>();
    let unassigned = 0;
    for (const r of rows) {
      if (r.project_topik_id && r.project_topik_name) {
        map.set(r.project_topik_id, r.project_topik_name);
      } else {
        unassigned += 1;
      }
    }
    return {
      list: Array.from(map.entries()).sort((a, b) =>
        a[1].localeCompare(b[1], "id"),
      ),
      unassigned,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (matchFilter !== "all" && r.matched_status !== matchFilter) return false;
      if (materiFilter === "__unassigned") {
        if (r.project_topik_id) return false;
      } else if (materiFilter !== "all") {
        if (r.project_topik_id !== materiFilter) return false;
      }
      if (q) {
        const hay = `${r.user_name ?? ""} ${r.user_email ?? ""} ${JSON.stringify(r.raw_response)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, matchFilter, materiFilter]);

  const stats = useMemo(() => {
    const matched = rows.filter((r) => r.matched_status === "matched").length;
    const unmatched = rows.filter((r) => r.matched_status === "unmatched").length;
    const ambiguous = rows.filter((r) => r.matched_status === "ambiguous").length;
    return { total: rows.length, matched, unmatched, ambiguous };
  }, [rows]);

  // Per-materi summary: average score per topik (only meaningful for tests).
  const materiSummary = useMemo(() => {
    if (jenis === "survey_kepuasan") return [];
    const map = new Map<string, { name: string; scores: number[] }>();
    for (const r of rows) {
      if (!r.project_topik_id || !r.project_topik_name) continue;
      if (r.score == null) continue;
      const cur = map.get(r.project_topik_id) ?? {
        name: r.project_topik_name,
        scores: [],
      };
      cur.scores.push(Number(r.score));
      map.set(r.project_topik_id, cur);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({
        id,
        name: v.name,
        count: v.scores.length,
        avg: v.scores.length
          ? Math.round((v.scores.reduce((a, b) => a + b, 0) / v.scores.length) * 10) / 10
          : 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [rows, jenis]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const effectivePage = Math.min(page, totalPages);
  const start = (effectivePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  // Survey kepuasan doesn't have numeric scores - drop the Skor column.
  const showScore = jenis !== "survey_kepuasan";

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-atr-outline bg-atr-bg-soft p-8 text-center">
        <Inbox className="mx-auto mb-2 h-6 w-6 text-atr-fg-muted" />
        <p className="text-sm font-bold text-atr-fg">Belum ada hasil sync</p>
        <p className="mt-1 text-xs text-atr-fg-muted">
          Konfigurasi Google Form bertipe <strong>{CHIP_LABEL[jenis]}</strong>{" "}
          di section atas, lalu jalankan sync.
        </p>
      </div>
    );
  }

  return (
    <>
      {materiSummary.length > 0 && (
        <div className="rounded-lg border border-atr-outline bg-atr-bg-soft p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
            Rata-rata Skor per Materi ({CHIP_LABEL[jenis]})
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {materiSummary.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => {
                  setMateriFilter(m.id);
                  setPage(1);
                }}
                className={`rounded-md border p-2 text-left transition hover:border-atr-purple ${
                  materiFilter === m.id
                    ? "border-atr-purple bg-atr-purple-50/50"
                    : "border-atr-outline bg-white"
                }`}
              >
                <div className="line-clamp-2 text-[11px] font-bold text-atr-fg">
                  {m.name}
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-atr-purple-600">
                    {m.avg}
                  </span>
                  <span className="text-[10px] text-atr-fg-muted">
                    rata-rata · {m.count} hasil
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-atr-fg-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama, email, atau jawaban…"
            className="h-10 w-full rounded-md border border-atr-outline bg-white pl-9 pr-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        </div>
        <select
          value={matchFilter}
          onChange={(e) => {
            setMatchFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
        >
          <option value="all">Status: Semua ({stats.total})</option>
          <option value="matched">Status: Matched ({stats.matched})</option>
          <option value="unmatched">
            Status: Unmatched ({stats.unmatched})
          </option>
          <option value="ambiguous">
            Status: Ambiguous ({stats.ambiguous})
          </option>
        </select>
        {(materiOptions.list.length > 0 || materiOptions.unassigned > 0) && (
          <select
            value={materiFilter}
            onChange={(e) => {
              setMateriFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
          >
            <option value="all">Materi: Semua</option>
            {materiOptions.list.map(([id, name]) => (
              <option key={id} value={id}>
                Materi: {name}
              </option>
            ))}
            {materiOptions.unassigned > 0 && (
              <option value="__unassigned">
                Materi: Belum diklasifikasi ({materiOptions.unassigned})
              </option>
            )}
          </select>
        )}
      </div>

      <p className="text-xs text-atr-fg-muted">
        Menampilkan {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)}{" "}
        dari {filtered.length} hasil
      </p>

      <div className="overflow-hidden rounded-lg border border-atr-outline">
        <table className="w-full text-sm">
          <thead className="bg-atr-bg-soft text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            <tr>
              <th className="px-3 py-2">Peserta</th>
              <th className="px-3 py-2">Materi</th>
              {showScore && <th className="px-3 py-2">Skor</th>}
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Submitted</th>
              <th className="w-8 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-atr-outline">
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={showScore ? 6 : 5}
                  className="px-3 py-12 text-center text-sm italic text-atr-fg-muted"
                >
                  Tidak ada hasil sesuai filter.
                </td>
              </tr>
            ) : (
              pageRows.map((r) => {
                const isExpanded = expandedId === r.id;
                return (
                  <FragmentRow
                    key={r.id}
                    row={r}
                    showScore={showScore}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedId(isExpanded ? null : r.id)}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          page={effectivePage}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      )}
    </>
  );
}

function FragmentRow({
  row,
  showScore,
  isExpanded,
  onToggle,
}: {
  row: TestResultRow;
  showScore: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="hover:bg-atr-bg-soft">
        <td className="px-3 py-2">
          {row.user_name ? (
            <>
              <div className="font-bold text-atr-fg">{row.user_name}</div>
              {row.user_email && (
                <div className="text-[11px] text-atr-fg-muted">
                  {row.user_email}
                </div>
              )}
            </>
          ) : (
            <span className="italic text-atr-fg-muted">
              {(row.raw_response["Email Address"] as string) ?? "-"}
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-xs text-atr-fg-muted">
          {row.project_topik_name ? (
            <span className="inline-flex items-center rounded-full bg-atr-purple-50 px-2 py-0.5 text-[10px] font-bold text-atr-purple-600">
              {row.project_topik_name}
            </span>
          ) : (
            <span className="italic">-</span>
          )}
        </td>
        {showScore && (
          <td className="px-3 py-2 font-bold text-atr-fg">
            {row.score != null ? (
              <>
                {row.score}
                {row.max_score && (
                  <span className="text-xs font-normal text-atr-fg-muted">
                    {" "}
                    / {row.max_score}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs italic text-atr-fg-muted">-</span>
            )}
          </td>
        )}
        <td className="px-3 py-2">
          {row.matched_status === "matched" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-atr-arti/15 px-2 py-0.5 text-[10px] font-bold text-atr-arti">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Matched
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-atr-yellow/20 px-2 py-0.5 text-[10px] font-bold text-atr-fg">
              <AlertCircle className="h-2.5 w-2.5" />
              {row.matched_status === "unmatched" ? "Unmatched" : "Ambiguous"}
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-xs text-atr-fg-muted">
          {fmtDate(row.submitted_at)}
        </td>
        <td className="px-3 py-2">
          <button
            type="button"
            onClick={onToggle}
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
        <tr>
          <td colSpan={showScore ? 6 : 5} className="bg-atr-bg-soft px-3 py-3">
            <div className="rounded-lg border border-atr-outline bg-white p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
                Raw Response dari Google Sheet
              </div>
              <dl className="space-y-1.5 text-xs">
                {Object.entries(row.raw_response).map(([k, v]) => (
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
}

// =====================================================
// Sub-component: Kuisioner Narasumber
// =====================================================
function NarasumberRatingTable({ rows }: { rows: NarasumberRatingRow[] }) {
  const [search, setSearch] = useState("");
  const [narasumberFilter, setNarasumberFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const narasumberOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) seen.set(r.narasumber_id, r.narasumber_name);
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);

  const aggregate = useMemo(() => {
    if (rows.length === 0) return null;
    const sum = rows.reduce((a, r) => a + r.rating, 0);
    return { avg: sum / rows.length, count: rows.length };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (narasumberFilter !== "all" && r.narasumber_id !== narasumberFilter)
        return false;
      if (q) {
        const hay = `${r.narasumber_name} ${r.rater_name ?? ""} ${r.rater_email ?? ""} ${r.comment ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, narasumberFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const effectivePage = Math.min(page, totalPages);
  const start = (effectivePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-atr-outline bg-atr-bg-soft p-8 text-center">
        <Inbox className="mx-auto mb-2 h-6 w-6 text-atr-fg-muted" />
        <p className="text-sm font-bold text-atr-fg">
          Belum ada penilaian kuisioner narasumber
        </p>
        <p className="mt-1 text-xs text-atr-fg-muted">
          Peserta bisa mengisi kuisioner penilaian narasumber dari halaman
          project mereka.
        </p>
      </div>
    );
  }

  return (
    <>
      {aggregate && (
        <div className="flex items-center gap-2 rounded-lg border border-atr-purple/20 bg-atr-purple-50/40 px-3.5 py-2 text-xs text-atr-fg">
          <Star className="h-4 w-4 fill-atr-yellow text-atr-yellow" />
          Rata-rata seluruh narasumber{" "}
          <strong className="text-atr-fg">★ {aggregate.avg.toFixed(2)}</strong>{" "}
          dari {aggregate.count} penilaian peserta.
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-atr-fg-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari narasumber, peserta, atau komentar…"
            className="h-10 w-full rounded-md border border-atr-outline bg-white pl-9 pr-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        </div>
        <select
          value={narasumberFilter}
          onChange={(e) => {
            setNarasumberFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
        >
          <option value="all">Narasumber: Semua ({rows.length})</option>
          {narasumberOptions.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-atr-fg-muted">
        Menampilkan {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)}{" "}
        dari {filtered.length} penilaian
      </p>

      <div className="overflow-hidden rounded-lg border border-atr-outline">
        <table className="w-full text-sm">
          <thead className="bg-atr-bg-soft text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            <tr>
              <th className="px-3 py-2">Narasumber</th>
              <th className="px-3 py-2">Peserta</th>
              <th className="px-3 py-2">Rating</th>
              <th className="px-3 py-2">Komentar</th>
              <th className="px-3 py-2">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-atr-outline">
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-12 text-center text-sm italic text-atr-fg-muted"
                >
                  Tidak ada penilaian sesuai filter.
                </td>
              </tr>
            ) : (
              pageRows.map((r) => (
                <tr key={r.id} className="hover:bg-atr-bg-soft">
                  <td className="px-3 py-2 font-bold text-atr-fg">
                    {r.narasumber_name}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-bold text-atr-fg">
                      {r.rater_name ?? "-"}
                    </div>
                    {r.rater_email && (
                      <div className="text-[11px] text-atr-fg-muted">
                        {r.rater_email}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-atr-yellow/20 px-2 py-0.5 text-[10px] font-bold text-atr-fg">
                      <Star className="h-2.5 w-2.5 fill-atr-yellow text-atr-yellow" />
                      ★ {r.rating}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-atr-fg">
                    {r.comment ? (
                      <span className="line-clamp-2">{r.comment}</span>
                    ) : (
                      <span className="italic text-atr-fg-muted">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-atr-fg-muted">
                    {fmtDate(r.submitted_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          page={effectivePage}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      )}
    </>
  );
}

function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <nav className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onPrev}
        disabled={page === 1}
        className="inline-flex h-9 items-center gap-1 rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft disabled:opacity-40"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Sebelumnya
      </button>
      <span className="text-xs text-atr-fg-muted">
        Halaman <strong className="text-atr-fg">{page}</strong> dari{" "}
        {totalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page === totalPages}
        className="inline-flex h-9 items-center gap-1 rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft disabled:opacity-40"
      >
        Selanjutnya
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </nav>
  );
}
