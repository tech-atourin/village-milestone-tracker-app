"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Search,
  Plus,
  Pencil,
  Star,
} from "lucide-react";
import type { NarasumberRow } from "@/server/queries/narasumber";
import {
  NarasumberFormDialog,
  type NarasumberFormValue,
} from "./narasumber-form";

const KATEGORI_LABEL: Record<string, string> = {
  praktisi: "Praktisi",
  akademisi: "Akademisi",
  profesional: "Profesional",
  pns: "PNS",
  lainnya: "Lain-lain",
};

const KATEGORI_COLOR: Record<string, string> = {
  praktisi: "bg-atr-purple-50 text-atr-purple-600",
  akademisi: "bg-atr-arti/15 text-atr-arti",
  profesional: "bg-atr-yellow/20 text-atr-fg",
  pns: "bg-atr-purple-light/40 text-atr-purple-800",
  lainnya: "bg-atr-bg-soft text-atr-fg-muted",
};

export function NarasumberDirectory({
  rows,
  kategoriOptions,
  kompetensiOptions,
  canManage = false,
  detailHrefBase = "/atourin/narasumber",
}: {
  rows: NarasumberRow[];
  kategoriOptions: string[];
  kompetensiOptions: string[];
  canManage?: boolean;
  detailHrefBase?: string;
}) {
  const [search, setSearch] = useState("");
  const [katFilter, setKatFilter] = useState<string>("all");
  const [kompFilter, setKompFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [formValue, setFormValue] = useState<NarasumberFormValue | null>(null);

  const kategori = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.kategori_narasumber) set.add(r.kategori_narasumber);
    return Array.from(set).sort();
  }, [rows]);

  const kompetensi = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.kompetensi) set.add(r.kompetensi);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (katFilter !== "all" && r.kategori_narasumber !== katFilter) return false;
      if (kompFilter !== "all" && r.kompetensi !== kompFilter) return false;
      if (q) {
        const hay =
          `${r.full_name} ${r.email ?? ""} ${r.kompetensi ?? ""} ${r.instansi ?? ""} ${r.kota ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, katFilter, kompFilter]);

  function openAdd() {
    setFormValue(null);
    setFormOpen(true);
  }
  function openEdit(r: NarasumberRow) {
    setFormValue({
      id: r.id,
      full_name: r.full_name,
      email: r.email,
      phone: r.phone,
      jabatan: r.jabatan,
      instansi: r.instansi,
      kota: r.kota,
      gender: r.gender,
      kategori_narasumber: r.kategori_narasumber,
      kompetensi: r.kompetensi,
    });
    setFormOpen(true);
  }

  void openAdd;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-atr-fg-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, instansi, kota..."
            className="h-10 w-full rounded-md border border-atr-outline bg-white pl-9 pr-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        </div>
        <select
          value={katFilter}
          onChange={(e) => setKatFilter(e.target.value)}
          className="h-10 rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
        >
          <option value="all">Semua Kategori</option>
          {kategori.map((k) => (
            <option key={k} value={k}>
              {KATEGORI_LABEL[k] ?? k}
            </option>
          ))}
        </select>
        <select
          value={kompFilter}
          onChange={(e) => setKompFilter(e.target.value)}
          className="h-10 rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
        >
          <option value="all">Semua Kompetensi</option>
          {kompetensi.map((k) => (
            <option key={k} value={k}>
              {k.length > 50 ? k.slice(0, 50) + "..." : k}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-atr-fg-muted">
        Menampilkan {filtered.length} dari {rows.length} narasumber
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <p className="text-sm font-bold text-atr-fg">
            Tidak ada hasil
          </p>
          <p className="mt-1 text-xs text-atr-fg-muted">
            Reset filter atau ubah kata kunci pencarian.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="relative block rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1 transition hover:border-atr-purple/40 hover:bg-atr-purple-50/30"
            >
              {canManage && (
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  className="absolute right-3 top-3 inline-flex h-7 items-center gap-1 rounded-md border border-atr-outline bg-white px-2 text-[11px] font-bold text-atr-fg-muted hover:border-atr-purple/40 hover:text-atr-purple-600"
                  title="Edit narasumber"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
              <Link
                href={`${detailHrefBase}/${r.id}`}
                className="block"
              >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-atr-yellow/25 text-atr-fg">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-atr-fg">
                    {r.full_name}
                  </h3>
                  {r.jabatan && (
                    <p className="truncate text-[11px] text-atr-fg-muted">
                      {r.jabatan}
                    </p>
                  )}
                  {r.instansi && (
                    <p className="truncate text-[11px] text-atr-fg-muted">
                      {r.instansi}
                    </p>
                  )}
                </div>
              </div>

              {r.kompetensi && (
                <p className="mt-3 line-clamp-2 text-xs text-atr-fg">
                  {r.kompetensi}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {r.kategori_narasumber && (
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      KATEGORI_COLOR[r.kategori_narasumber] ??
                      "bg-atr-bg-soft text-atr-fg"
                    }`}
                  >
                    {KATEGORI_LABEL[r.kategori_narasumber] ??
                      r.kategori_narasumber}
                  </span>
                )}
                {r.kota && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-atr-fg-muted">
                    <MapPin className="h-2.5 w-2.5" />
                    {r.kota}
                  </span>
                )}
                {r.avg_rating != null && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-atr-yellow/20 px-2 py-0.5 text-[10px] font-bold text-atr-fg">
                    <Star className="h-2.5 w-2.5 fill-atr-yellow text-atr-yellow" />
                    {r.avg_rating.toFixed(1)}
                    <span className="font-normal text-atr-fg-muted">
                      ({r.rating_count})
                    </span>
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1 text-[11px] text-atr-fg-muted">
                {r.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{r.email}</span>
                  </div>
                )}
                {r.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 shrink-0" />
                    {r.phone}
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-atr-outline bg-atr-bg-soft p-2 text-center text-[10px]">
                <div>
                  <div className="font-bold text-atr-fg">{r.projects_count}</div>
                  <div className="text-atr-fg-muted">Project</div>
                </div>
                <div>
                  <div className="font-bold text-atr-fg">{r.desa_count}</div>
                  <div className="text-atr-fg-muted">Desa</div>
                </div>
                <div>
                  <div className="font-bold text-atr-fg">{r.sessions_count}</div>
                  <div className="text-atr-fg-muted">Sesi</div>
                </div>
              </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      <NarasumberFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        value={formValue}
        kategoriOptions={kategoriOptions}
        kompetensiOptions={kompetensiOptions}
      />
    </div>
  );
}
