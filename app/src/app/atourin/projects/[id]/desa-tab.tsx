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
} from "lucide-react";
import {
  attachDesaToProject,
  createDesaAction,
} from "@/server/actions/desa";
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
}: {
  projectId: string;
  attached: ProjectDesaRow[];
  allDesa: DesaRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showSearch, setShowSearch] = useState(false);
  const [q, setQ] = useState("");
  const [newDesaForm, setNewDesaForm] = useState<null | {
    name: string;
    kabupaten: string;
    provinsi: string;
  }>(null);
  const [error, setError] = useState<string | null>(null);

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

  function createAndAttach() {
    if (!newDesaForm) return;
    setError(null);
    startTransition(async () => {
      const c = await createDesaAction({
        name: newDesaForm.name.trim(),
        kabupaten: newDesaForm.kabupaten || null,
        provinsi: newDesaForm.provinsi || null,
      });
      if (c.error || !c.desa) {
        setError(c.error || "Gagal create desa");
        return;
      }
      const r = await attachDesaToProject({ project_id: projectId, desa_id: c.desa.id });
      if (r.error) setError(r.error);
      else {
        setNewDesaForm(null);
        setShowSearch(false);
        router.refresh();
      }
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
        <button
          type="button"
          onClick={() => setShowSearch((s) => !s)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-sm font-bold text-white transition hover:bg-atr-purple-600"
        >
          <Plus className="h-4 w-4" />
          Tambah Desa
        </button>
      </div>

      {showSearch && (
        <div className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
          {newDesaForm ? (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-atr-fg">
                Buat desa baru
              </h4>
              <input
                type="text"
                placeholder="Nama desa (cth: Desa Wisata Wanurejo)"
                value={newDesaForm.name}
                onChange={(e) =>
                  setNewDesaForm({ ...newDesaForm, name: e.target.value })
                }
                className="h-10 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Kabupaten"
                  value={newDesaForm.kabupaten}
                  onChange={(e) =>
                    setNewDesaForm({
                      ...newDesaForm,
                      kabupaten: e.target.value,
                    })
                  }
                  className="h-10 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                />
                <input
                  type="text"
                  placeholder="Provinsi"
                  value={newDesaForm.provinsi}
                  onChange={(e) =>
                    setNewDesaForm({
                      ...newDesaForm,
                      provinsi: e.target.value,
                    })
                  }
                  className="h-10 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                />
              </div>
              {error && (
                <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewDesaForm(null)}
                  className="inline-flex h-9 items-center rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={createAndAttach}
                  disabled={pending || !newDesaForm.name.trim()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
                >
                  {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Buat + Lampirkan
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atr-fg-muted" />
                  <input
                    type="search"
                    placeholder="Cari desa di master…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="h-10 w-full rounded-lg border border-atr-outline bg-white pl-10 pr-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNewDesaForm({ name: q, kabupaten: "", provinsi: "" })
                  }
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Buat baru
                </button>
              </div>

              {error && (
                <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
                  {error}
                </div>
              )}

              <ul className="max-h-64 divide-y divide-atr-outline overflow-y-auto rounded-lg border border-atr-outline">
                {candidates.length === 0 ? (
                  <li className="p-4 text-center text-xs text-atr-fg-muted">
                    Tidak ada desa di master yang cocok. Klik &quot;Buat
                    baru&quot;.
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
                        <div className="text-xs text-atr-fg-muted">
                          {[d.kabupaten, d.provinsi].filter(Boolean).join(" · ") ||
                            "—"}
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
        <AttachedDesaTable projectId={projectId} attached={attached} />
      )}
    </div>
  );
}

function AttachedDesaTable({
  projectId,
  attached,
}: {
  projectId: string;
  attached: ProjectDesaRow[];
}) {
  const rows = attached.map((p) => ({
    ...p,
    desa_name: p.desa.name,
    location: [p.desa.kabupaten, p.desa.provinsi].filter(Boolean).join(" · ") || "—",
    tier: p.classification_at_start ?? "unclassified",
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
      header: "Tier saat masuk",
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
          href={`/atourin/projects/${projectId}/desa/${row.original.id}`}
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
        { key: "tier", label: "Tier saat masuk", options: tierOptions },
      ]}
    />
  );
}

import { DataTable as RequireClientTable } from "@/components/data-table";

export { Check, X };
