"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ListChecks,
  Trash,
} from "lucide-react";
import {
  upsertTemplate,
  deleteTemplate,
  type UpsertTemplateInput,
} from "@/server/actions/templates";

const MODULE_LABELS: Record<string, string> = {
  baseline: "Baseline Desa",
  capacity_building: "Capacity Building",
  pendampingan: "Pendampingan Lapangan",
  klasifikasi: "Klasifikasi Nasional",
  forum: "Forum Diskusi",
  rencana_aksi: "Rencana Aksi",
};

export type TemplateEditorValue = {
  id?: string;
  name: string;
  description: string;
  default_modules: Record<string, boolean>;
  topik: Array<{
    id?: string;
    name: string;
    description: string;
    items: Array<{
      id?: string;
      title: string;
      description: string;
      reference_url: string;
      required: boolean;
    }>;
  }>;
};

export function TemplateEditor({
  initial,
}: {
  initial: TemplateEditorValue;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"save" | "delete" | null>(null);
  const [form, setForm] = useState<TemplateEditorValue>(initial);

  const totalItems = form.topik.reduce((a, t) => a + t.items.length, 0);

  function setField<K extends keyof TemplateEditorValue>(
    k: K,
    v: TemplateEditorValue[K],
  ) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toggleModule(key: string) {
    setForm((f) => ({
      ...f,
      default_modules: { ...f.default_modules, [key]: !f.default_modules[key] },
    }));
  }

  function addTopik() {
    setForm((f) => ({
      ...f,
      topik: [
        ...f.topik,
        { name: "", description: "", items: [] },
      ],
    }));
  }

  function removeTopik(idx: number) {
    if (!confirm("Hapus topik ini beserta seluruh checklist-nya?")) return;
    setForm((f) => ({
      ...f,
      topik: f.topik.filter((_, i) => i !== idx),
    }));
  }

  function moveTopik(idx: number, dir: -1 | 1) {
    setForm((f) => {
      const next = [...f.topik];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return f;
      [next[idx], next[j]] = [next[j], next[idx]];
      return { ...f, topik: next };
    });
  }

  function updateTopik(
    idx: number,
    patch: Partial<TemplateEditorValue["topik"][number]>,
  ) {
    setForm((f) => ({
      ...f,
      topik: f.topik.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    }));
  }

  function addItem(topikIdx: number) {
    updateTopik(topikIdx, {
      items: [
        ...form.topik[topikIdx].items,
        { title: "", description: "", reference_url: "", required: true },
      ],
    });
  }

  function removeItem(topikIdx: number, itemIdx: number) {
    const next = form.topik[topikIdx].items.filter((_, i) => i !== itemIdx);
    updateTopik(topikIdx, { items: next });
  }

  function moveItem(topikIdx: number, itemIdx: number, dir: -1 | 1) {
    const items = [...form.topik[topikIdx].items];
    const j = itemIdx + dir;
    if (j < 0 || j >= items.length) return;
    [items[itemIdx], items[j]] = [items[j], items[itemIdx]];
    updateTopik(topikIdx, { items });
  }

  function updateItem(
    topikIdx: number,
    itemIdx: number,
    patch: Partial<TemplateEditorValue["topik"][number]["items"][number]>,
  ) {
    const items = form.topik[topikIdx].items.map((it, i) =>
      i === itemIdx ? { ...it, ...patch } : it,
    );
    updateTopik(topikIdx, { items });
  }

  function submit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Nama template wajib diisi");
      return;
    }
    if (form.topik.length === 0) {
      setError("Minimal 1 topik wajib ditambahkan");
      return;
    }
    for (let i = 0; i < form.topik.length; i++) {
      if (!form.topik[i].name.trim()) {
        setError(`Topik #${i + 1} wajib diberi nama`);
        return;
      }
      for (let j = 0; j < form.topik[i].items.length; j++) {
        if (!form.topik[i].items[j].title.trim()) {
          setError(`Topik "${form.topik[i].name}" item #${j + 1} wajib diberi judul`);
          return;
        }
      }
    }
    setBusyAction("save");
    startTransition(async () => {
      const payload: UpsertTemplateInput = {
        id: form.id ?? null,
        name: form.name.trim(),
        description: form.description.trim() || null,
        default_modules: form.default_modules,
        topik: form.topik.map((t) => ({
          name: t.name.trim(),
          description: t.description.trim() || null,
          items: t.items.map((it) => ({
            title: it.title.trim(),
            description: it.description.trim() || null,
            reference_url: it.reference_url.trim() || null,
            required: it.required,
          })),
        })),
      };
      const r = await upsertTemplate(payload);
      setBusyAction(null);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      router.push("/atourin/templates");
      router.refresh();
    });
  }

  function remove() {
    if (!form.id) return;
    if (
      !confirm(
        `Hapus template "${form.name}"? Aksi ini tidak bisa dibatalkan. Project yang sudah pakai template ini tidak terpengaruh karena snapshot.`,
      )
    )
      return;
    setBusyAction("delete");
    startTransition(async () => {
      const r = await deleteTemplate(form.id!);
      setBusyAction(null);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      router.push("/atourin/templates");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
        <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          <ListChecks className="h-4 w-4 text-atr-purple" />
          Info Dasar
        </h2>
        <div className="space-y-3">
          <Field label="Nama template" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="cth: Pendampingan Desa Wisata Standard"
              className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </Field>
          <Field label="Deskripsi">
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={2}
              placeholder="Template default Atourin dengan 7 topik utama…"
              className="w-full rounded-lg border border-atr-outline bg-white p-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </Field>
          <Field label="Modul default">
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(MODULE_LABELS).map(([key, label]) => {
                const checked = !!form.default_modules[key];
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition ${
                      checked
                        ? "border-atr-purple bg-atr-purple-50 text-atr-fg"
                        : "border-atr-outline bg-white text-atr-fg-muted hover:bg-atr-bg-soft"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleModule(key)}
                      className="accent-atr-purple"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
            <ListChecks className="h-4 w-4 text-atr-purple" />
            Topik & Checklist ({form.topik.length} topik · {totalItems} item)
          </h2>
          <button
            type="button"
            onClick={addTopik}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-purple/40 bg-atr-purple-50 px-3 text-xs font-bold text-atr-purple-600 hover:bg-atr-purple-light/40"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Topik
          </button>
        </div>

        {form.topik.length === 0 && (
          <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-8 text-center">
            <p className="text-sm text-atr-fg-muted">
              Belum ada topik. Klik &quot;Tambah Topik&quot; untuk mulai.
            </p>
          </div>
        )}

        {form.topik.map((t, ti) => (
          <article
            key={ti}
            className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1"
          >
            <header className="mb-3 flex items-start gap-2">
              <div className="flex shrink-0 flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveTopik(ti, -1)}
                  disabled={ti === 0}
                  className="rounded-md border border-atr-outline bg-white p-1 text-atr-fg-muted hover:bg-atr-bg-soft disabled:opacity-30"
                  aria-label="Pindah ke atas"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveTopik(ti, 1)}
                  disabled={ti === form.topik.length - 1}
                  className="rounded-md border border-atr-outline bg-white p-1 text-atr-fg-muted hover:bg-atr-bg-soft disabled:opacity-30"
                  aria-label="Pindah ke bawah"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={t.name}
                  onChange={(e) => updateTopik(ti, { name: e.target.value })}
                  placeholder={`Topik ${ti + 1} - cth: Kelembagaan`}
                  className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                />
                <input
                  type="text"
                  value={t.description}
                  onChange={(e) =>
                    updateTopik(ti, { description: e.target.value })
                  }
                  placeholder="Deskripsi topik (opsional)"
                  className="h-9 w-full rounded-lg border border-atr-outline bg-white px-3 text-xs outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                />
              </div>
              <button
                type="button"
                onClick={() => removeTopik(ti)}
                className="shrink-0 rounded-md border border-atr-outline bg-white p-2 text-atr-fg-muted hover:border-atr-red/30 hover:text-atr-red"
                aria-label="Hapus topik"
                title="Hapus topik"
              >
                <Trash className="h-3.5 w-3.5" />
              </button>
            </header>

            <ul className="space-y-2 pl-2">
              {t.items.map((it, ii) => (
                <li
                  key={ii}
                  className="rounded-lg border border-atr-outline bg-atr-bg-soft p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex shrink-0 flex-col gap-0.5 pt-1">
                      <button
                        type="button"
                        onClick={() => moveItem(ti, ii, -1)}
                        disabled={ii === 0}
                        className="rounded-md border border-atr-outline bg-white p-0.5 text-atr-fg-muted hover:bg-white disabled:opacity-30"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(ti, ii, 1)}
                        disabled={ii === t.items.length - 1}
                        className="rounded-md border border-atr-outline bg-white p-0.5 text-atr-fg-muted hover:bg-white disabled:opacity-30"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="text"
                        value={it.title}
                        onChange={(e) =>
                          updateItem(ti, ii, { title: e.target.value })
                        }
                        placeholder={`Item ${ii + 1} - cth: Memiliki SK Pokdarwis aktif`}
                        className="h-9 w-full rounded-lg border border-atr-outline bg-white px-2.5 text-sm font-bold outline-none focus:border-atr-purple"
                      />
                      <input
                        type="text"
                        value={it.description}
                        onChange={(e) =>
                          updateItem(ti, ii, { description: e.target.value })
                        }
                        placeholder="Deskripsi / panduan singkat untuk peserta (opsional)"
                        className="h-9 w-full rounded-lg border border-atr-outline bg-white px-2.5 text-xs outline-none focus:border-atr-purple"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="url"
                          value={it.reference_url}
                          onChange={(e) =>
                            updateItem(ti, ii, {
                              reference_url: e.target.value,
                            })
                          }
                          placeholder="Reference URL (opsional)"
                          className="h-8 flex-1 rounded-md border border-atr-outline bg-white px-2 text-[11px] outline-none focus:border-atr-purple"
                        />
                        <label className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-[11px] font-bold text-atr-fg">
                          <input
                            type="checkbox"
                            checked={it.required}
                            onChange={(e) =>
                              updateItem(ti, ii, { required: e.target.checked })
                            }
                            className="accent-atr-purple"
                          />
                          Wajib
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(ti, ii)}
                      className="shrink-0 rounded-md border border-atr-outline bg-white p-1.5 text-atr-fg-muted hover:border-atr-red/30 hover:text-atr-red"
                      aria-label="Hapus item"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => addItem(ti)}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-atr-outline bg-white px-2.5 text-[11px] font-bold text-atr-fg-muted hover:border-atr-purple/40 hover:text-atr-purple"
                >
                  <Plus className="h-3 w-3" />
                  Tambah item
                </button>
              </li>
            </ul>
          </article>
        ))}
      </section>

      {error && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-sm text-atr-red">
          {error}
        </div>
      )}

      <footer className="sticky bottom-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1">
        {form.id ? (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-red/30 bg-white px-3 text-xs font-bold text-atr-red transition hover:bg-atr-red/10 disabled:opacity-50"
          >
            {busyAction === "delete" && pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Hapus template
          </button>
        ) : (
          <span />
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/atourin/templates")}
            className="inline-flex h-10 items-center rounded-lg border border-atr-outline bg-white px-4 text-sm font-bold text-atr-fg hover:bg-atr-bg-soft"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !form.name.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50"
          >
            {busyAction === "save" && pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {form.id ? "Simpan perubahan" : "Buat template"}
          </button>
        </div>
      </footer>
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
