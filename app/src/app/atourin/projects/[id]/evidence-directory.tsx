"use client";

import { useMemo, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Search,
  Download,
  ExternalLink,
  Inbox,
} from "lucide-react";
import type { EvidenceDirectoryRow } from "@/server/queries/evidence-directory";

function fmtDate(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function fmtSize(bytes: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const PAGE_SIZE = 25;

export function EvidenceDirectory({
  files,
}: {
  files: EvidenceDirectoryRow[];
}) {
  const [search, setSearch] = useState("");
  const [desaFilter, setDesaFilter] = useState<string>("all");
  const [topikFilter, setTopikFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const desaOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of files) {
      if (f.desa) map.set(f.desa.id, f.desa.name);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], "id"),
    );
  }, [files]);

  const topikOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of files) {
      if (f.topik) map.set(f.topik.id, f.topik.name);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], "id"),
    );
  }, [files]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return files.filter((f) => {
      if (desaFilter !== "all" && f.desa?.id !== desaFilter) return false;
      if (topikFilter !== "all" && f.topik?.id !== topikFilter) return false;
      if (q) {
        const hay = [
          f.original_filename,
          f.caption,
          f.uploader?.full_name,
          f.desa?.name,
          f.topik?.name,
          f.checklist_item?.title,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [files, search, desaFilter, topikFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const effectivePage = Math.min(page, totalPages);
  const start = (effectivePage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  if (files.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
        <Inbox className="mx-auto mb-2 h-6 w-6 text-atr-fg-muted" />
        <p className="text-sm font-bold text-atr-fg">Belum ada bukti</p>
        <p className="mt-1 text-xs text-atr-fg-muted">
          File bukti akan muncul di sini saat peserta upload.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
            placeholder="Cari filename, peserta, topik…"
            className="h-10 w-full rounded-md border border-atr-outline bg-white pl-9 pr-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        </div>
        <select
          value={desaFilter}
          onChange={(e) => {
            setDesaFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
        >
          <option value="all">Semua desa</option>
          {desaOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={topikFilter}
          onChange={(e) => {
            setTopikFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
        >
          <option value="all">Semua topik</option>
          {topikOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-atr-fg-muted">
        Menampilkan {start + 1}-{Math.min(start + PAGE_SIZE, filtered.length)}{" "}
        dari {filtered.length} file
      </p>

      <div className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1">
        <table className="w-full text-sm">
          <thead className="bg-atr-bg-soft text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            <tr>
              <th className="px-3 py-2">File</th>
              <th className="px-3 py-2">Desa</th>
              <th className="px-3 py-2">Topik · Item</th>
              <th className="px-3 py-2">Uploader</th>
              <th className="px-3 py-2 text-right">Tanggal</th>
              <th className="w-10 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-atr-outline">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-12 text-center text-sm italic text-atr-fg-muted"
                >
                  Tidak ada file cocok dengan filter.
                </td>
              </tr>
            ) : (
              rows.map((f) => {
                const Icon = f.file_type === "image" ? ImageIcon : FileText;
                return (
                  <tr key={f.id} className="hover:bg-atr-bg-soft">
                    <td className="px-3 py-2">
                      <div className="flex items-start gap-2">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-atr-purple" />
                        <div className="min-w-0">
                          <div className="truncate font-bold text-atr-fg">
                            {f.original_filename ?? "(tanpa nama)"}
                          </div>
                          {f.caption && (
                            <div className="line-clamp-1 text-[11px] text-atr-fg-muted">
                              {f.caption}
                            </div>
                          )}
                          <div className="text-[10px] text-atr-fg-muted">
                            {fmtSize(f.file_size_bytes)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-atr-fg">
                      {f.desa?.name ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {f.topik?.name ? (
                        <>
                          <div className="font-bold text-atr-fg">
                            {f.topik.name}
                          </div>
                          {f.checklist_item?.title && (
                            <div className="line-clamp-1 text-[11px] text-atr-fg-muted">
                              {f.checklist_item.title}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="italic text-atr-fg-muted">
                          {f.tag_type ?? "-"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-atr-fg">
                      {f.uploader?.full_name ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-atr-fg-muted">
                      {fmtDate(f.uploaded_at)}
                    </td>
                    <td className="px-3 py-2">
                      <a
                        href={`/api/evidence/${f.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-atr-fg-muted hover:bg-atr-purple-50 hover:text-atr-purple-600"
                        title="Buka / download"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-atr-outline bg-atr-bg-soft px-3 py-2 text-xs">
            <span className="text-atr-fg-muted">
              Halaman {effectivePage} dari {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={effectivePage === 1}
                className="rounded-md border border-atr-outline bg-white px-2 py-1 font-bold text-atr-fg-muted disabled:opacity-40 disabled:hover:bg-white"
              >
                ‹ Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={effectivePage === totalPages}
                className="rounded-md border border-atr-outline bg-white px-2 py-1 font-bold text-atr-fg-muted disabled:opacity-40 disabled:hover:bg-white"
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
