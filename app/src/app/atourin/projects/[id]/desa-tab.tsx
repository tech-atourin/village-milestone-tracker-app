"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Plus,
  Search,
  Loader2,
  Check,
  X,
  Database,
} from "lucide-react";
import { attachDesaToProject } from "@/server/actions/desa";
import { importHubDesaToProject } from "@/server/actions/hub-import";
import type { DesaRow, ProjectDesaRow } from "@/server/queries/desa";

const TIER_LABEL: Record<string, string> = {
  unclassified: "Belum",
  rintisan: "Rintisan",
  berkembang: "Berkembang",
  maju: "Maju",
  mandiri: "Mandiri",
};

const TIER_STYLE: Record<string, string> = {
  unclassified: "bg-atr-bg-soft text-atr-fg-muted",
  rintisan: "bg-atr-yellow/20 text-atr-fg",
  berkembang: "bg-atr-arti/15 text-atr-arti",
  maju: "bg-atr-purple-50 text-atr-purple-600",
  mandiri: "bg-atr-purple-light/60 text-atr-purple-800",
};

export function DesaTab({
  projectId,
  attached,
  allDesa,
  scope = "atourin",
}: {
  projectId: string;
  attached: ProjectDesaRow[];
  allDesa: DesaRow[];
  scope?: "atourin" | "mitra";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showSearch, setShowSearch] = useState(false);
  const [showHub, setShowHub] = useState(false);
  const [hubQ, setHubQ] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [hubResults, setHubResults] = useState<any[]>([]);
  const [hubSearching, setHubSearching] = useState(false);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Both scopes need a way to register a brand-new desa. Atourin has the
  // master Desa menu; mitra is routed there as well (mirror added).
  const desaMenuHref = scope === "mitra" ? "/mitra/desa" : "/atourin/desa";

  async function searchHub() {
    setHubSearching(true);
    setError(null);
    try {
      const r = await fetch(`/api/hub/search-desa?q=${encodeURIComponent(hubQ)}`);
      const data = await r.json();
      if (!r.ok || data.error) {
        setError(`Gagal cari di Hub: ${data.error ?? r.statusText}`);
      }
      setHubResults(data.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal cari di Hub");
    } finally {
      setHubSearching(false);
    }
  }

  function importFromHub(hubDesaId: string) {
    setError(null);
    startTransition(async () => {
      const r = await importHubDesaToProject({
        project_id: projectId,
        hub_desa_id: hubDesaId,
      });
      if (r.error) setError(r.error);
      else {
        setShowHub(false);
        setHubQ("");
        setHubResults([]);
        router.refresh();
      }
    });
  }

  const attachedIds = new Set(attached.map((p) => p.desa.id));
  const candidates = allDesa
    .filter((d) => !attachedIds.has(d.id))
    .filter(
      (d) =>
        !q ||
        d.name.toLowerCase().includes(q.toLowerCase()) ||
        (d.kabupaten ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (d.provinsi ?? "").toLowerCase().includes(q.toLowerCase()),
    )
    .slice(0, 50);

  function attach(desaId: string) {
    setError(null);
    startTransition(async () => {
      const r = await attachDesaToProject({ project_id: projectId, desa_id: desaId });
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-atr-fg">
            Desa di project ini
          </h3>
          <p className="text-sm text-atr-fg-muted">
            {attached.length} desa terdaftar
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowHub((s) => !s)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-purple/40 bg-atr-purple-50 px-3 text-sm font-bold text-atr-purple-600 transition hover:bg-atr-purple-light/40"
          >
            <Database className="h-4 w-4" />
            Import dari Hub (5.964 desa)
          </button>
          <button
            type="button"
            onClick={() => setShowSearch((s) => !s)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-sm font-bold text-white transition hover:bg-atr-purple-600"
          >
            <Plus className="h-4 w-4" />
            Tambah Desa
          </button>
        </div>
      </div>

      {showHub && (
        <div className="rounded-2xl border border-atr-purple/30 bg-atr-purple-50/40 p-5 shadow-atr-1">
          <h4 className="mb-3 text-sm font-bold text-atr-fg">
            🔍 Search Hub Atourin (5.964 desa wisata)
          </h4>
          <div className="flex gap-2">
            <input
              type="search"
              value={hubQ}
              onChange={(e) => setHubQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchHub()}
              placeholder="Nama desa, kabupaten, atau provinsi…"
              className="h-10 flex-1 rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
            <button
              type="button"
              onClick={searchHub}
              disabled={hubSearching || hubQ.length < 2}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
            >
              {hubSearching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              Cari
            </button>
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
              {error}
            </div>
          )}

          {hubResults.length > 0 && (
            <ul className="mt-3 max-h-80 divide-y divide-atr-outline overflow-y-auto rounded-lg border border-atr-outline bg-white">
              {hubResults.map((d) => (
                <li
                  key={d.id}
                  className="flex items-start gap-3 p-3 hover:bg-atr-bg-soft"
                >
                  {d.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.cover_image_url}
                      alt={d.nama}
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-atr-fg">
                        {d.nama}
                      </span>
                      {d.kategori && (
                        <span className="inline-flex rounded-full bg-atr-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-atr-purple-600">
                          {d.kategori}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-atr-fg-muted">
                      {[d.kabupaten, d.provinsi].filter(Boolean).join(" · ")}
                    </div>
                    {d.jumlah_kunjungan && (
                      <div className="text-[11px] text-atr-fg-muted">
                        {d.jumlah_kunjungan.toLocaleString("id-ID")} kunjungan
                        tahunan
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => importFromHub(d.id)}
                    disabled={pending}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-atr-purple px-2.5 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
                  >
                    {pending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    Import
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-2 text-[11px] text-atr-fg-muted">
            ✨ Hub adalah master 5.964 desa wisata milik internal Atourin.
            Import akan otomatis pre-fill baseline + history ADWI.
          </p>
        </div>
      )}

      {showSearch && (
        <div className="space-y-3 rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
          <div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atr-fg-muted" />
              <input
                type="search"
                placeholder="Ketik nama desa, kabupaten, atau provinsi…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
                className="h-10 w-full rounded-lg border border-atr-outline bg-white pl-10 pr-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-atr-fg-muted">
              Pilih dari master desa yang sudah terdaftar. Belum ada?{" "}
              <Link
                href={desaMenuHref}
                className="font-bold text-atr-purple-600 hover:underline"
              >
                Daftarkan dulu di menu Desa →
              </Link>
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
              {error}
            </div>
          )}

          {q && (
            <ul className="max-h-64 divide-y divide-atr-outline overflow-y-auto rounded-lg border border-atr-outline">
              {candidates.length === 0 ? (
                <li className="p-4 text-center text-xs text-atr-fg-muted">
                  Tidak ada desa di master yang cocok. Daftarkan dulu di menu{" "}
                  <Link
                    href={desaMenuHref}
                    className="font-bold text-atr-purple-600 hover:underline"
                  >
                    Desa
                  </Link>
                  .
                </li>
              ) : (
                candidates.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-atr-bg-soft"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-atr-fg">
                        {d.name}
                      </div>
                      <div className="inline-flex items-center gap-1 text-xs text-atr-fg-muted">
                        <MapPin className="h-3 w-3" />
                        {[d.kabupaten, d.provinsi]
                          .filter(Boolean)
                          .join(" · ") || "Lokasi belum diisi"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => attach(d.id)}
                      disabled={pending}
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-atr-purple px-2.5 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
                    >
                      {pending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      Lampirkan
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowSearch(false)}
              className="text-xs text-atr-fg-muted hover:text-atr-fg"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {attached.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-atr-bg-soft">
            <MapPin className="h-5 w-5 text-atr-fg-muted" />
          </div>
          <p className="text-sm font-bold text-atr-fg">
            Belum ada desa yang dilampirkan
          </p>
          <p className="mt-1 text-xs text-atr-fg-muted">
            Klik &quot;Tambah Desa&quot; di atas untuk mulai.
          </p>
        </div>
      ) : (
        <AttachedDesaTable
          projectId={projectId}
          attached={attached}
          scope={scope}
        />
      )}
    </div>
  );
}

function AttachedDesaTable({
  projectId,
  attached,
  scope,
}: {
  projectId: string;
  attached: ProjectDesaRow[];
  scope: "atourin" | "mitra";
}) {
  const rows = attached.map((p) => ({
    ...p,
    desa_name: p.desa.name,
    location: [p.desa.kabupaten, p.desa.provinsi].filter(Boolean).join(" · ") || "-",
    tier: p.desa.current_classification ?? "unclassified",
    progress: p.topik_summary.avg_pct,
  }));
  type Row = (typeof rows)[number];

  const columns: import("@tanstack/react-table").ColumnDef<Row, unknown>[] = [
    {
      accessorKey: "desa_name",
      header: "Desa",
      cell: ({ getValue }) => (
        <span className="font-bold text-atr-fg">{getValue() as string}</span>
      ),
    },
    { accessorKey: "location", header: "Lokasi" },
    {
      accessorKey: "tier",
      header: "Klasifikasi Desa",
      cell: ({ getValue }) => {
        const t = (getValue() as string) as keyof typeof TIER_LABEL;
        return (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${TIER_STYLE[t]}`}
          >
            {TIER_LABEL[t]}
          </span>
        );
      },
    },
    {
      accessorKey: "progress",
      header: "Progress",
      cell: ({ getValue }) => {
        const v = Math.round(getValue() as number);
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-atr-bg-soft">
              <div
                className="h-full bg-atr-purple transition-all"
                style={{ width: `${v}%` }}
              />
            </div>
            <span className="text-xs text-atr-fg-muted">{v}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: "peserta_count",
      header: "Peserta",
      cell: ({ getValue }) => {
        const n = getValue() as number;
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
              n === 0
                ? "bg-atr-yellow/20 text-atr-fg"
                : "bg-atr-purple-50 text-atr-purple-600"
            }`}
            title={
              n === 0
                ? "Belum ada peserta dari desa ini"
                : `${n} peserta dari desa ini`
            }
          >
            {n} orang
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <Link
          href={`/${scope}/projects/${projectId}/desa/${row.original.id}`}
          className="text-sm font-bold text-atr-purple hover:text-atr-purple-600"
        >
          Detail →
        </Link>
      ),
    },
  ];

  const tierOptions = Object.entries(TIER_LABEL).map(([v, l]) => ({
    value: v,
    label: l,
  }));

  return (
    <RequireClientTable
      data={rows}
      columns={columns}
      searchKeys={["desa_name", "location"]}
      searchPlaceholder="Cari nama desa atau lokasi…"
      filters={[
        { key: "tier", label: "Klasifikasi Desa", options: tierOptions },
      ]}
    />
  );
}

import { DataTable as RequireClientTable } from "@/components/data-table";

export { Check, X };
