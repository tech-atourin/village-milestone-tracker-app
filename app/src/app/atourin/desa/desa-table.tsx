"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  FileText,
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import type { DesaListRow } from "@/server/queries/desa-master";

const TIER_BADGE: Record<string, string> = {
  rintisan: "bg-atr-yellow/20 text-atr-fg",
  berkembang: "bg-atr-arti/15 text-atr-arti",
  maju: "bg-atr-purple-50 text-atr-purple-600",
  mandiri: "bg-atr-purple-light/60 text-atr-purple-800",
  unclassified: "bg-atr-bg-soft text-atr-fg-muted",
};
const TIER_LABEL: Record<string, string> = {
  rintisan: "Rintisan",
  berkembang: "Berkembang",
  maju: "Maju",
  mandiri: "Mandiri",
  unclassified: "Belum",
};

const PAGE_SIZE = 20;

export function DesaTable({
  rows,
  scope,
}: {
  rows: DesaListRow[];
  scope: "atourin" | "mitra";
}) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [provinsiFilter, setProvinsiFilter] = useState<string>("all");
  const [hubFilter, setHubFilter] = useState<"all" | "yes" | "no">("all");
  const [sortKey, setSortKey] = useState<"name" | "lokasi" | "tier" | "project_count">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  function toggleSort(k: typeof sortKey) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  const provinsiOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.provinsi) set.add(r.provinsi);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const tier = r.current_classification ?? "unclassified";
      if (tierFilter !== "all" && tier !== tierFilter) return false;
      if (provinsiFilter !== "all" && r.provinsi !== provinsiFilter) return false;
      if (hubFilter === "yes" && !r.hub_desa_id) return false;
      if (hubFilter === "no" && r.hub_desa_id) return false;
      if (q) {
        const hay = `${r.name} ${r.kabupaten ?? ""} ${r.provinsi ?? ""} ${r.kecamatan ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, tierFilter, provinsiFilter, hubFilter]);

  const sorted = useMemo(() => {
    const TIER_ORDER: Record<string, number> = {
      unclassified: 0,
      rintisan: 1,
      berkembang: 2,
      maju: 3,
      mandiri: 4,
    };
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name, "id-ID");
      else if (sortKey === "lokasi") {
        const la = `${a.provinsi ?? ""}|${a.kabupaten ?? ""}`;
        const lb = `${b.provinsi ?? ""}|${b.kabupaten ?? ""}`;
        cmp = la.localeCompare(lb, "id-ID");
      } else if (sortKey === "tier") {
        cmp =
          (TIER_ORDER[a.current_classification ?? "unclassified"] ?? 0) -
          (TIER_ORDER[b.current_classification ?? "unclassified"] ?? 0);
      } else if (sortKey === "project_count") {
        cmp = (a.project_count ?? 0) - (b.project_count ?? 0);
      }
      return cmp * dir;
    });
  }, [filtered, sortKey, sortDir]);

  // Reset page when filters change
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const effectivePage = Math.min(page, totalPages);
  const start = (effectivePage - 1) * PAGE_SIZE;
  const pageRows = sorted.slice(start, start + PAGE_SIZE);

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: rows.length,
      rintisan: 0,
      berkembang: 0,
      maju: 0,
      mandiri: 0,
      unclassified: 0,
    };
    for (const r of rows) {
      const t = r.current_classification ?? "unclassified";
      counts[t] = (counts[t] ?? 0) + 1;
    }
    return counts;
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-atr-fg-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama desa, kabupaten, provinsi..."
            className="h-10 w-full rounded-md border border-atr-outline bg-white pl-9 pr-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => {
            setTierFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
        >
          <option value="all">Semua Tier · {tierCounts.all}</option>
          <option value="rintisan">Rintisan · {tierCounts.rintisan}</option>
          <option value="berkembang">Berkembang · {tierCounts.berkembang}</option>
          <option value="maju">Maju · {tierCounts.maju}</option>
          <option value="mandiri">Mandiri · {tierCounts.mandiri}</option>
          <option value="unclassified">Belum · {tierCounts.unclassified}</option>
        </select>
        <select
          value={provinsiFilter}
          onChange={(e) => {
            setProvinsiFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
        >
          <option value="all">Semua Provinsi</option>
          {provinsiOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={hubFilter}
          onChange={(e) => {
            setHubFilter(e.target.value as typeof hubFilter);
            setPage(1);
          }}
          className="h-10 rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
        >
          <option value="all">Linked Hub: Semua</option>
          <option value="yes">Linked Hub: Ya</option>
          <option value="no">Linked Hub: Tidak</option>
        </select>
      </div>

      <p className="text-xs text-atr-fg-muted">
        Menampilkan {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} dari{" "}
        {filtered.length} desa
        {filtered.length !== rows.length && ` (filter dari ${rows.length})`}
      </p>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1">
        <table className="w-full text-sm">
          <thead className="bg-atr-bg-soft text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            <tr>
              <SortableTh active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")}>
                Desa
              </SortableTh>
              <SortableTh active={sortKey === "lokasi"} dir={sortDir} onClick={() => toggleSort("lokasi")}>
                Lokasi
              </SortableTh>
              <SortableTh active={sortKey === "tier"} dir={sortDir} onClick={() => toggleSort("tier")}>
                Klasifikasi
              </SortableTh>
              <th className="px-4 py-3 text-center">Baseline</th>
              <th className="px-4 py-3 text-center">Self-Assessment</th>
              {scope === "atourin" && (
                <SortableTh
                  align="center"
                  active={sortKey === "project_count"}
                  dir={sortDir}
                  onClick={() => toggleSort("project_count")}
                >
                  Project
                </SortableTh>
              )}
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-atr-outline">
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={scope === "atourin" ? 7 : 6}
                  className="px-4 py-12 text-center text-sm italic text-atr-fg-muted"
                >
                  Tidak ada hasil. Reset filter atau ubah kata kunci.
                </td>
              </tr>
            ) : (
              pageRows.map((r) => {
                const tier = r.current_classification ?? "unclassified";
                const href = `/${scope}/desa/${r.id}`;
                return (
                  <tr key={r.id} className="hover:bg-atr-bg-soft">
                    <td className="px-4 py-3">
                      <Link
                        href={href}
                        className="font-bold text-atr-purple-600 hover:text-atr-purple"
                      >
                        {r.name}
                      </Link>
                      {r.hub_desa_id && (
                        <div className="text-[10px] text-atr-fg-muted">
                          ✨ Linked ke Hub
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-atr-fg-muted">
                      {[r.kabupaten, r.provinsi].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${TIER_BADGE[tier]}`}
                      >
                        {TIER_LABEL[tier]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.has_baseline ? (
                        <ClipboardCheck className="mx-auto h-4 w-4 text-atr-arti" />
                      ) : (
                        <span className="text-[10px] italic text-atr-fg-muted">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.has_hub_assessment ? (
                        <FileText className="mx-auto h-4 w-4 text-atr-arti" />
                      ) : (
                        <span className="text-[10px] italic text-atr-fg-muted">
                          —
                        </span>
                      )}
                    </td>
                    {scope === "atourin" && (
                      <td className="px-4 py-3 text-center text-atr-fg-muted">
                        {r.project_count}
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={href}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-atr-outline bg-white px-2 text-[11px] font-bold text-atr-fg hover:bg-atr-bg-soft"
                      >
                        Detail
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
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
      ) : null}
    </div>
  );
}

function SortableTh({
  children,
  active,
  dir,
  onClick,
  align = "left",
}: {
  children: React.ReactNode;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "center";
}) {
  const Icon = !active
    ? ChevronsUpDown
    : dir === "asc"
      ? ChevronUp
      : ChevronDown;
  return (
    <th className={`px-4 py-3 ${align === "center" ? "text-center" : ""}`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 transition hover:text-atr-fg ${
          active ? "text-atr-purple-600" : ""
        }`}
      >
        {children}
        <Icon className="h-3 w-3" />
      </button>
    </th>
  );
}
