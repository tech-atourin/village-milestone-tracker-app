"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2, X } from "lucide-react";
import {
  upsertCriteriaItem,
  deleteCriteriaItem,
} from "@/server/actions/klasifikasi-master";

export type CriteriaItemRow = {
  id: string;
  master_id: string;
  title: string;
  description: string | null;
  category: string | null;
  tier: "rintisan" | "berkembang" | "maju" | "mandiri";
  sort_order: number | null;
  weight: number | null;
  required: boolean | null;
};

const TIERS = ["rintisan", "berkembang", "maju", "mandiri"] as const;
const TIER_LABEL: Record<string, string> = {
  rintisan: "Rintisan",
  berkembang: "Berkembang",
  maju: "Maju",
  mandiri: "Mandiri",
};
const TIER_STYLE: Record<string, string> = {
  rintisan: "bg-atr-yellow/20 text-atr-fg",
  berkembang: "bg-atr-arti/15 text-atr-arti",
  maju: "bg-atr-purple-50 text-atr-purple-600",
  mandiri: "bg-atr-purple-light/60 text-atr-purple-800",
};

export function V1MasterEditor({
  masterId,
  items,
}: {
  masterId: string;
  items: CriteriaItemRow[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<CriteriaItemRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const counts = TIERS.reduce<Record<string, number>>(
    (a, t) => ({ ...a, [t]: items.filter((i) => i.tier === t).length }),
    {},
  );
  const visible = filter === "all" ? items : items.filter((i) => i.tier === filter);

  function onDelete(it: CriteriaItemRow) {
    if (
      !confirm(
        `Hapus kriteria "${it.title}"?\n\nTindakan ini permanen dan akan mempengaruhi semua desa yang sudah mengisi assessment V1.`,
      )
    )
      return;
    setDeletingId(it.id);
    startTransition(async () => {
      const r = await deleteCriteriaItem(it.id);
      setDeletingId(null);
      if ("error" in r) alert("Gagal hapus: " + r.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap gap-1.5">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="Semua"
            count={items.length}
          />
          {TIERS.map((t) => (
            <FilterChip
              key={t}
              active={filter === t}
              onClick={() => setFilter(t)}
              label={TIER_LABEL[t]}
              count={counts[t] ?? 0}
            />
          ))}
        </nav>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-purple/40 bg-atr-purple-50 px-3 text-sm font-bold text-atr-purple-600 hover:bg-atr-purple-light/40"
        >
          <Plus className="h-4 w-4" />
          Tambah Kriteria
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center text-sm text-atr-fg-muted">
          Belum ada kriteria di tier ini.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-atr-outline bg-white">
          <table className="w-full text-sm">
            <thead className="bg-atr-bg-soft text-left text-[10px] uppercase tracking-wide text-atr-fg-muted">
              <tr>
                <th className="px-3 py-2 w-12">#</th>
                <th className="px-3 py-2">Kriteria</th>
                <th className="px-3 py-2 w-32">Kategori</th>
                <th className="px-3 py-2 w-28">Tier</th>
                <th className="px-3 py-2 w-20 text-right">Bobot</th>
                <th className="px-3 py-2 w-24">Wajib</th>
                <th className="px-3 py-2 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-atr-outline">
              {visible.map((it) => (
                <tr key={it.id} className="hover:bg-atr-bg-soft/40">
                  <td className="px-3 py-2 text-atr-fg-muted">{it.sort_order ?? "-"}</td>
                  <td className="px-3 py-2">
                    <div className="font-bold text-atr-fg">{it.title}</div>
                    {it.description && (
                      <div className="mt-0.5 text-xs text-atr-fg-muted line-clamp-2">
                        {it.description}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-atr-fg-muted">
                    {it.category ?? "-"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${TIER_STYLE[it.tier]}`}
                    >
                      {TIER_LABEL[it.tier]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-atr-fg-muted">
                    {it.weight ?? "-"}
                  </td>
                  <td className="px-3 py-2">
                    {it.required ? (
                      <span className="text-xs font-bold text-atr-red">Wajib</span>
                    ) : (
                      <span className="text-xs text-atr-fg-muted">Opsional</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(it)}
                        className="inline-flex h-7 items-center rounded-md border border-atr-outline bg-white px-2 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(it)}
                        disabled={deletingId === it.id}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-atr-red/30 bg-atr-red/5 text-atr-red hover:bg-atr-red/10 disabled:opacity-50"
                        title="Hapus"
                      >
                        {deletingId === it.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(editing || creating) && (
        <EditDialog
          masterId={masterId}
          initial={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${
        active
          ? "bg-atr-purple text-white"
          : "border border-atr-outline bg-white text-atr-fg-muted hover:bg-atr-bg-soft"
      }`}
    >
      {label}
      <span
        className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] ${
          active ? "bg-white/25" : "bg-atr-bg-soft"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function EditDialog({
  masterId,
  initial,
  onClose,
  onSaved,
}: {
  masterId: string;
  initial: CriteriaItemRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "",
    tier: (initial?.tier ?? "rintisan") as CriteriaItemRow["tier"],
    sort_order: initial?.sort_order ?? 0,
    weight: initial?.weight ?? 1,
    required: initial?.required ?? false,
  });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!form.title.trim()) {
      setError("Judul kriteria wajib diisi");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await upsertCriteriaItem({
        id: initial?.id ?? null,
        master_id: masterId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        tier: form.tier,
        sort_order: Number(form.sort_order) || 0,
        weight: Number(form.weight) || 1,
        required: form.required,
      });
      if ("error" in r && r.error) {
        setError(r.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-atr-fg/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-atr-outline bg-white p-6 shadow-2xl">
        <header className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold text-atr-fg">
            {initial ? "Edit Kriteria" : "Tambah Kriteria"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-atr-fg-muted hover:bg-atr-bg-soft hover:text-atr-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="space-y-3">
          <Field label="Judul kriteria" required>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="h-10 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </Field>
          <Field label="Deskripsi / poin yang diharapkan">
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={4}
              className="w-full rounded-lg border border-atr-outline p-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tier">
              <select
                value={form.tier}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tier: e.target.value as CriteriaItemRow["tier"],
                  }))
                }
                className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              >
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {TIER_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kategori">
              <input
                type="text"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                placeholder="Cth: Atraksi"
                className="h-10 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              />
            </Field>
            <Field label="Urutan">
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))
                }
                className="h-10 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              />
            </Field>
            <Field label="Bobot">
              <input
                type="number"
                step="0.1"
                value={form.weight}
                onChange={(e) =>
                  setForm((f) => ({ ...f, weight: Number(e.target.value) }))
                }
                className="h-10 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-atr-fg">
            <input
              type="checkbox"
              checked={form.required}
              onChange={(e) =>
                setForm((f) => ({ ...f, required: e.target.checked }))
              }
              className="h-4 w-4 accent-atr-purple"
            />
            Wajib dipenuhi untuk naik tier ini
          </label>
        </div>
        {error && (
          <div className="mt-3 rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
            {error}
          </div>
        )}
        <footer className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg hover:bg-atr-bg-soft"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Simpan
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 inline-block text-xs font-bold text-atr-fg">
        {label}
        {required && <span className="ml-0.5 text-atr-red">*</span>}
      </span>
      {children}
    </label>
  );
}
