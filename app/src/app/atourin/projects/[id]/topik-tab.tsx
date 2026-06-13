"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Save,
} from "lucide-react";
import {
  addTopik,
  renameTopik,
  deleteTopik,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
} from "@/server/actions/topik";
import type { ProjectTopikWithItems } from "@/server/queries/topik";

export function TopikTab({
  projectId,
  topik,
  editable = false,
}: {
  projectId?: string;
  topik: ProjectTopikWithItems[];
  editable?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAddTopik, setShowAddTopik] = useState(false);
  const [newTopikName, setNewTopikName] = useState("");
  const [newTopikDesc, setNewTopikDesc] = useState("");
  const [editingTopik, setEditingTopik] = useState<string | null>(null);
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ error?: string } | undefined>) {
    setError(null);
    setPending(true);
    startTransition(async () => {
      const r = await fn();
      if (r?.error) setError(r.error);
      else router.refresh();
      setPending(false);
    });
  }

  if (topik.length === 0 && !editable) {
    return (
      <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
        <p className="text-sm font-bold text-atr-fg">
          Belum ada topik di project ini
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-atr-fg">Topik & checklist</h3>
          <p className="text-sm text-atr-fg-muted">
            {topik.length} topik aktif, total{" "}
            {topik.reduce((acc, t) => acc + t.items.length, 0)} checklist item.
          </p>
        </div>
        {editable && projectId && (
          <button
            type="button"
            onClick={() => setShowAddTopik((s) => !s)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-sm font-bold text-white transition hover:bg-atr-purple-600"
          >
            <Plus className="h-4 w-4" />
            Tambah Topik
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
          {error}
        </div>
      )}

      {editable && showAddTopik && projectId && (
        <div className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
          <h4 className="mb-3 text-sm font-bold text-atr-fg">Topik baru</h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nama topik"
              value={newTopikName}
              onChange={(e) => setNewTopikName(e.target.value)}
              className="h-10 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
            <textarea
              placeholder="Deskripsi (opsional)"
              value={newTopikDesc}
              onChange={(e) => setNewTopikDesc(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-atr-outline p-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddTopik(false);
                  setNewTopikName("");
                  setNewTopikDesc("");
                }}
                className="inline-flex h-9 items-center rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={pending || newTopikName.trim().length < 2}
                onClick={() =>
                  run(async () => {
                    const r = await addTopik({
                      project_id: projectId,
                      name: newTopikName.trim(),
                      description: newTopikDesc.trim() || null,
                    });
                    if (!r.error) {
                      setShowAddTopik(false);
                      setNewTopikName("");
                      setNewTopikDesc("");
                    }
                    return r;
                  })
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
              >
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {topik.map((t, idx) => (
          <details
            key={t.id}
            open={idx === 0}
            className="group rounded-2xl border border-atr-outline bg-white shadow-atr-1"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-atr-purple-50 text-xs font-bold text-atr-purple">
                    {t.sort_order || idx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-atr-fg">{t.name}</h4>
                </div>
                {t.description && (
                  <p className="mt-1 text-xs text-atr-fg-muted">
                    {t.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right text-xs text-atr-fg-muted">
                  <div className="font-bold text-atr-fg">
                    {t.items.length} item
                  </div>
                  <div>
                    {t.items.filter((i) => i.required).length} wajib
                  </div>
                </div>
                {editable && projectId && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setEditingTopik(t.id);
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-atr-outline bg-white text-atr-fg-muted transition hover:bg-atr-bg-soft"
                      title="Edit topik"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        if (
                          confirm(
                            `Hapus topik "${t.name}"? Semua checklist + progress akan ikut terhapus.`,
                          )
                        ) {
                          run(() =>
                            deleteTopik({ id: t.id, project_id: projectId }),
                          );
                        }
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-atr-outline bg-white text-atr-fg-muted transition hover:border-atr-red/30 hover:text-atr-red"
                      title="Hapus topik"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            </summary>

            {editable && projectId && editingTopik === t.id && (
              <RenameTopikInline
                projectId={projectId}
                topik={t}
                onCancel={() => setEditingTopik(null)}
                onSave={(input) =>
                  run(async () => {
                    const r = await renameTopik(input);
                    if (!r.error) setEditingTopik(null);
                    return r;
                  })
                }
                pending={pending}
              />
            )}

            <div className="border-t border-atr-outline px-5 py-4">
              <ul className="divide-y divide-atr-outline">
                {t.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 py-2.5 text-sm"
                  >
                    {editable && projectId && editingItem === item.id ? (
                      <EditItemInline
                        projectId={projectId}
                        item={item}
                        onCancel={() => setEditingItem(null)}
                        onSave={(input) =>
                          run(async () => {
                            const r = await updateChecklistItem(input);
                            if (!r.error) setEditingItem(null);
                            return r;
                          })
                        }
                        pending={pending}
                      />
                    ) : (
                      <>
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-atr-fg-muted" />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-atr-fg">
                            {item.title}
                            {item.required && (
                              <span className="ml-1.5 text-xs font-bold text-atr-red">
                                *
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="mt-0.5 text-xs text-atr-fg-muted">
                              {item.description}
                            </p>
                          )}
                        </div>
                        {editable && projectId && (
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingItem(item.id)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-atr-outline bg-white text-atr-fg-muted transition hover:bg-atr-bg-soft"
                              title="Edit item"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Hapus "${item.title}"?`)) {
                                  run(() =>
                                    deleteChecklistItem({
                                      id: item.id,
                                      project_id: projectId,
                                    }),
                                  );
                                }
                              }}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-atr-outline bg-white text-atr-fg-muted transition hover:border-atr-red/30 hover:text-atr-red"
                              title="Hapus item"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>

              {editable && projectId && (
                addingItemTo === t.id ? (
                  <AddItemInline
                    projectTopikId={t.id}
                    projectId={projectId}
                    onCancel={() => setAddingItemTo(null)}
                    onSave={(input) =>
                      run(async () => {
                        const r = await addChecklistItem(input);
                        if (!r.error) setAddingItemTo(null);
                        return r;
                      })
                    }
                    pending={pending}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingItemTo(t.id)}
                    className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg-muted transition hover:border-atr-purple/40 hover:text-atr-purple-600"
                  >
                    <Plus className="h-3 w-3" />
                    Tambah checklist item
                  </button>
                )
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function RenameTopikInline({
  projectId,
  topik,
  onCancel,
  onSave,
  pending,
}: {
  projectId: string;
  topik: ProjectTopikWithItems;
  onCancel: () => void;
  onSave: (input: {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
  }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(topik.name);
  const [desc, setDesc] = useState(topik.description ?? "");
  return (
    <div className="space-y-2 border-t border-atr-outline bg-atr-bg-soft p-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-9 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
      />
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-atr-outline bg-white p-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-outline bg-white px-2.5 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
        >
          <X className="h-3 w-3" />
          Batal
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            onSave({
              id: topik.id,
              project_id: projectId,
              name: name.trim(),
              description: desc.trim() || null,
            })
          }
          className="inline-flex h-8 items-center gap-1 rounded-md bg-atr-purple px-2.5 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          Simpan
        </button>
      </div>
    </div>
  );
}

function AddItemInline({
  projectTopikId,
  projectId,
  onCancel,
  onSave,
  pending,
}: {
  projectTopikId: string;
  projectId: string;
  onCancel: () => void;
  onSave: (input: {
    project_topik_id: string;
    project_id: string;
    title: string;
    description: string | null;
    required: boolean;
  }) => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [required, setRequired] = useState(true);

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-atr-outline bg-atr-bg-soft p-3">
      <input
        type="text"
        placeholder="Judul checklist"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-9 w-full rounded-md border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
      />
      <textarea
        placeholder="Deskripsi/panduan (opsional)"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={2}
        className="w-full rounded-md border border-atr-outline bg-white p-2.5 text-xs outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs text-atr-fg">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="h-3.5 w-3.5 accent-atr-purple"
          />
          Wajib
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-7 items-center rounded-md border border-atr-outline bg-white px-2 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={pending || title.trim().length < 2}
            onClick={() =>
              onSave({
                project_topik_id: projectTopikId,
                project_id: projectId,
                title: title.trim(),
                description: desc.trim() || null,
                required,
              })
            }
            className="inline-flex h-7 items-center gap-1 rounded-md bg-atr-purple px-2 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-3 w-3 animate-spin" />}
            Tambah
          </button>
        </div>
      </div>
    </div>
  );
}

function EditItemInline({
  projectId,
  item,
  onCancel,
  onSave,
  pending,
}: {
  projectId: string;
  item: ProjectTopikWithItems["items"][number];
  onCancel: () => void;
  onSave: (input: {
    id: string;
    project_id: string;
    title: string;
    description: string | null;
    required: boolean;
  }) => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState(item.title);
  const [desc, setDesc] = useState(item.description ?? "");
  const [required, setRequired] = useState(item.required);

  return (
    <div className="flex-1 space-y-2 rounded-lg border border-atr-outline bg-atr-bg-soft p-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-9 w-full rounded-md border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
      />
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={2}
        className="w-full rounded-md border border-atr-outline bg-white p-2.5 text-xs outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs text-atr-fg">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="h-3.5 w-3.5 accent-atr-purple"
          />
          Wajib
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-7 items-center rounded-md border border-atr-outline bg-white px-2 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              onSave({
                id: item.id,
                project_id: projectId,
                title: title.trim(),
                description: desc.trim() || null,
                required,
              })
            }
            className="inline-flex h-7 items-center gap-1 rounded-md bg-atr-purple px-2 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
