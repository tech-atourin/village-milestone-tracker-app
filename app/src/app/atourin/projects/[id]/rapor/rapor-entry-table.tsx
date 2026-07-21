"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  FileText,
  Award,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { saveRapor } from "@/server/actions/rapor";
import type { RaporRow } from "@/server/queries/rapor";
import { hitungNilaiAkhir, BOBOT_LABEL } from "@/lib/rapor/scoring";

type SortKey =
  | "name"
  | "desa"
  | "pre"
  | "post"
  | "tugas"
  | "keaktifan"
  | "attendance"
  | "delta"
  | "final";
type SortDir = "asc" | "desc";

type EditState = Record<
  string,
  {
    pre: string;
    post: string;
    tugas: string;
    keaktifan: string;
  }
>;

export function RaporEntryTable({
  projectId,
  rows,
  scope = "atourin",
}: {
  projectId: string;
  rows: RaporRow[];
  scope?: "atourin" | "mitra" | "narasumber";
}) {
  const router = useRouter();
  const [editState, setEditState] = useState<EditState>(() => {
    const init: EditState = {};
    for (const r of rows) {
      init[r.user_id] = {
        pre: r.pre_test_score?.toString() ?? "",
        post: r.post_test_score?.toString() ?? "",
        tugas: r.tugas_score?.toString() ?? "",
        keaktifan: r.keaktifan_score?.toString() ?? "",
      };
    }
    return init;
  });
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [desaFilter, setDesaFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const desaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.desa_name) set.add(r.desa_name);
    }
    return Array.from(set).sort();
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (desaFilter && r.desa_name !== desaFilter) return false;
      if (!q) return true;
      const hay = `${r.full_name} ${r.email ?? ""} ${r.desa_name ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
    const dir = sortDir === "asc" ? 1 : -1;
    const num = (v: number | null | undefined) =>
      v == null ? Number.NEGATIVE_INFINITY : v;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.full_name.localeCompare(b.full_name) * dir;
        case "desa":
          return (a.desa_name ?? "").localeCompare(b.desa_name ?? "") * dir;
        case "pre":
          return (num(a.pre_test_score) - num(b.pre_test_score)) * dir;
        case "post":
          return (num(a.post_test_score) - num(b.post_test_score)) * dir;
        case "tugas":
          return (num(a.tugas_score) - num(b.tugas_score)) * dir;
        case "keaktifan":
          return (num(a.keaktifan_score) - num(b.keaktifan_score)) * dir;
        case "attendance":
          return (num(a.attendance) - num(b.attendance)) * dir;
        case "delta":
          return (num(a.improvement_percent) - num(b.improvement_percent)) * dir;
        case "final":
          return (num(a.final_score) - num(b.final_score)) * dir;
      }
    });
  }, [rows, search, desaFilter, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  function update(
    userId: string,
    field: "pre" | "post" | "tugas" | "keaktifan",
    value: string,
  ) {
    setEditState((s) => ({
      ...s,
      [userId]: { ...s[userId], [field]: value },
    }));
  }

  function save(userId: string) {
    setPendingRowId(userId);
    const e = editState[userId];
    const pre = e.pre === "" ? null : Number(e.pre);
    const post = e.post === "" ? null : Number(e.post);
    const tugas = e.tugas === "" ? null : Number(e.tugas);
    const keaktifan = e.keaktifan === "" ? null : Number(e.keaktifan);

    startTransition(async () => {
      const r = await saveRapor({
        project_id: projectId,
        user_id: userId,
        pre_test_score: pre,
        post_test_score: post,
        tugas_score: tugas,
        keaktifan_score: keaktifan,
      });
      if (r.error) {
        alert(r.error);
      }
      setPendingRowId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atr-fg-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, atau desa…"
            className="h-10 w-full rounded-lg border border-atr-outline bg-white pl-10 pr-3 text-sm outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        </div>
        {desaOptions.length > 1 && (
          <select
            value={desaFilter}
            onChange={(e) => setDesaFilter(e.target.value)}
            aria-label="Filter desa"
            className={`h-10 rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15 ${
              desaFilter
                ? "border-atr-purple/50 text-atr-fg"
                : "border-atr-outline text-atr-fg-muted"
            }`}
          >
            <option value="">Desa: Semua</option>
            {desaOptions.map((d) => (
              <option key={d} value={d}>
                Desa: {d}
              </option>
            ))}
          </select>
        )}
        {(search || desaFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setDesaFilter("");
            }}
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg-muted transition hover:bg-atr-bg-soft"
          >
            <X className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>
      <div className="rounded-xl border border-atr-outline bg-atr-bg-soft/50 px-3 py-2 text-xs text-atr-fg-muted">
        <strong className="text-atr-fg">Komposisi Nilai Akhir:</strong>{" "}
        {BOBOT_LABEL.map((b) => `${b.label} ${b.percent}`).join(" + ")}. Nilai
        Akhir muncul setelah keempat komponen terisi. Kolom <strong>Hadir %</strong>{" "}
        terisi otomatis dari check-in per materi dan <strong>tidak</strong>{" "}
        ikut dihitung. Peserta hanya melihat Nilai Akhir, Pre-Test, dan
        Post-Test di rapor &amp; sertifikat, bukan Tugas/Keaktifan.
      </div>
      <div className="text-xs text-atr-fg-muted">
        {visibleRows.length} dari {rows.length} peserta
      </div>

      <div className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-atr-bg-soft">
            <tr className="text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              <SortableTh label="Nama" k="name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortableTh label="Desa" k="desa" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortableTh label="Pre" k="pre" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="w-24" />
              <SortableTh label="Post" k="post" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="w-24" />
              <SortableTh label="Tugas" k="tugas" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="w-24" />
              <SortableTh label="Keaktifan" k="keaktifan" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="w-28" />
              <SortableTh label="Hadir %" k="attendance" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="w-28" />
              <SortableTh label="Δ" k="delta" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="w-20" />
              <SortableTh label="Nilai Akhir" k="final" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="w-28" />
              <th className="px-4 py-3 w-32"></th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-atr-outline text-sm">
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-sm text-atr-fg-muted">
                  Tidak ada peserta yang cocok dengan filter.
                </td>
              </tr>
            )}
            {visibleRows.map((r) => {
              const e = editState[r.user_id];
              const dirty =
                e.pre !== (r.pre_test_score?.toString() ?? "") ||
                e.post !== (r.post_test_score?.toString() ?? "") ||
                e.tugas !== (r.tugas_score?.toString() ?? "") ||
                e.keaktifan !== (r.keaktifan_score?.toString() ?? "");
              const livePre = e.pre === "" ? null : Number(e.pre);
              const livePost = e.post === "" ? null : Number(e.post);
              const liveTugas = e.tugas === "" ? null : Number(e.tugas);
              const liveKeaktifan = e.keaktifan === "" ? null : Number(e.keaktifan);
              const liveFinal = hitungNilaiAkhir({
                pre_test_score: livePre,
                post_test_score: livePost,
                tugas_score: liveTugas,
                keaktifan_score: liveKeaktifan,
              });
              const isSaving = pendingRowId === r.user_id;
              return (
                <tr key={r.user_id} className="hover:bg-atr-bg-soft">
                  <td className="px-4 py-3">
                    <div className="font-bold text-atr-fg">{r.full_name}</div>
                    {r.email && (
                      <div className="text-xs text-atr-fg-muted">{r.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-atr-fg-muted">
                    <div>{r.desa_name ?? "-"}</div>
                    <span
                      className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        r.attendance_mode === "online"
                          ? "border-atr-yellow/40 bg-atr-yellow/20 text-atr-fg"
                          : "border-atr-arti/30 bg-atr-arti/15 text-atr-arti"
                      }`}
                    >
                      {r.attendance_mode === "online" ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreInput
                      value={e.pre}
                      onChange={(v) => update(r.user_id, "pre", v)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <ScoreInput
                      value={e.post}
                      onChange={(v) => update(r.user_id, "post", v)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <ScoreInput
                      value={e.tugas}
                      onChange={(v) => update(r.user_id, "tugas", v)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <ScoreInput
                      value={e.keaktifan}
                      onChange={(v) => update(r.user_id, "keaktifan", v)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-sm font-bold text-atr-fg"
                      title="Otomatis dari check-in per materi, bukan komponen penilaian"
                    >
                      {r.attendance != null ? `${r.attendance}%` : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.improvement_percent != null ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
                          r.improvement_percent > 0
                            ? "bg-atr-arti/15 text-atr-arti"
                            : r.improvement_percent < 0
                              ? "bg-atr-red/15 text-atr-red"
                              : "bg-atr-bg-soft text-atr-fg-muted"
                        }`}
                      >
                        {r.improvement_percent > 0 ? "+" : ""}
                        {r.improvement_percent}%
                      </span>
                    ) : (
                      <span className="text-xs text-atr-fg-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {liveFinal != null ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-sm font-bold ${
                          dirty
                            ? "bg-atr-yellow/25 text-atr-fg"
                            : "bg-atr-purple-50 text-atr-purple-700"
                        }`}
                        title={dirty ? "Perkiraan, belum disimpan" : "Nilai Akhir tersimpan"}
                      >
                        {liveFinal.toFixed(2)}
                      </span>
                    ) : (
                      <span
                        className="text-[11px] text-atr-fg-muted"
                        title="Nilai Akhir muncul setelah Pre, Post, Tugas, dan Keaktifan terisi"
                      >
                        Belum lengkap
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => save(r.user_id)}
                      disabled={isSaving || !dirty}
                      className="inline-flex h-8 items-center gap-1 rounded-md bg-atr-purple px-2.5 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-40"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      Simpan
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {r.has_rapor ? (
                      <div className="flex gap-1">
                        <Link
                          href={`/${scope}/projects/${projectId}/rapor/${r.user_id}`}
                          target="_blank"
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-outline bg-white px-2 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
                          title="RAPOR"
                        >
                          <FileText className="h-3 w-3" />
                        </Link>
                        <Link
                          href={`/${scope}/projects/${projectId}/rapor/${r.user_id}/sertifikat`}
                          target="_blank"
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-yellow/40 bg-atr-yellow/10 px-2 text-xs font-bold text-atr-fg transition hover:bg-atr-yellow/20"
                          title="Sertifikat"
                        >
                          <Award className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : (
                      <span className="text-xs text-atr-fg-muted">
                        -
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}

function SortableTh({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
  className = "",
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onClick: (k: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === k;
  return (
    <th className={`px-4 py-3 ${className}`}>
      <button
        type="button"
        onClick={() => onClick(k)}
        className="inline-flex items-center gap-1 transition hover:text-atr-fg"
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ChevronUp className="h-3 w-3 text-atr-purple" />
          ) : (
            <ChevronDown className="h-3 w-3 text-atr-purple" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 text-atr-fg-muted/60" />
        )}
      </button>
    </th>
  );
}

function ScoreInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      max={100}
      step={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="-"
      className="h-8 w-20 rounded-md border border-atr-outline px-2 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
    />
  );
}
