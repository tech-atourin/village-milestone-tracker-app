"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Link2,
  Upload,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File as FileIcon,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  Loader2,
  Download,
  ExternalLink,
  Plus,
  X,
} from "lucide-react";
import {
  createLinkResource,
  createFileResource,
  updateResource,
  deleteResource,
  togglePublishResource,
  signResourceDownload,
} from "@/server/actions/resources";
import type { ProjectResource } from "@/server/queries/resources";

const CATEGORIES = [
  "Materi",
  "Perhitungan",
  "Video",
  "Foto",
  "Rekaman",
  "Tes",
  "Evaluasi",
  "Lainnya",
];

function iconFor(r: ProjectResource) {
  if (r.kind === "link") return Link2;
  if (r.file_type === "image") return ImageIcon;
  if (r.file_type === "video") return Video;
  if (r.file_type === "audio") return Music;
  if (r.file_type === "document") return FileText;
  return FileIcon;
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MateriManager({
  projectId,
  items,
}: {
  projectId: string;
  items: ProjectResource[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "link" | "file">(null);
  const [editing, setEditing] = useState<ProjectResource | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-atr-fg">Materi &amp; Tautan</h3>
          <p className="text-sm text-atr-fg-muted">
            File dan tautan yang bisa diakses peserta project ini (materi, video,
            rekaman, link pre/post-test, form evaluasi, dll). File besar seperti
            video/rekaman zoom sebaiknya ditambahkan sebagai Tautan.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setMode("link");
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
          >
            <Link2 className="h-4 w-4" />
            Tambah Tautan
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setMode("file");
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-sm font-bold text-white transition hover:bg-atr-purple-600"
          >
            <Upload className="h-4 w-4" />
            Upload File
          </button>
        </div>
      </div>

      {(mode || editing) && (
        <ResourceForm
          projectId={projectId}
          mode={editing ? (editing.kind as "link" | "file") : (mode as "link" | "file")}
          editing={editing}
          onClose={() => {
            setMode(null);
            setEditing(null);
          }}
          onDone={() => {
            setMode(null);
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-atr-bg-soft/40 p-10 text-center text-sm text-atr-fg-muted">
          Belum ada materi atau tautan. Tambahkan lewat tombol di atas.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <ResourceRow
              key={r.id}
              r={r}
              onEdit={() => {
                setMode(null);
                setEditing(r);
              }}
              onChanged={() => router.refresh()}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ResourceRow({
  r,
  onEdit,
  onChanged,
}: {
  r: ProjectResource;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const Icon = iconFor(r);

  function open() {
    setErr(null);
    if (r.kind === "link" && r.url) {
      window.open(r.url, "_blank", "noopener,noreferrer");
      return;
    }
    startTransition(async () => {
      const res = await signResourceDownload(r.id);
      if ("error" in res) setErr(res.error);
      else window.open(res.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <li className="rounded-xl border border-atr-outline bg-white p-3 shadow-atr-1">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-atr-purple-50 text-atr-purple">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-atr-fg">{r.title}</span>
            {r.category && (
              <span className="rounded-full bg-atr-bg-soft px-2 py-0.5 text-[10px] font-bold text-atr-fg-muted">
                {r.category}
              </span>
            )}
            {!r.is_published && (
              <span className="rounded-full bg-atr-yellow/20 px-2 py-0.5 text-[10px] font-bold text-atr-fg">
                Draft
              </span>
            )}
          </div>
          {r.description && (
            <p className="mt-0.5 text-xs text-atr-fg-muted">{r.description}</p>
          )}
          <p className="mt-0.5 truncate text-[11px] text-atr-fg-muted">
            {r.kind === "link"
              ? r.url
              : `${r.original_filename ?? "file"} · ${fmtSize(r.file_size_bytes)}`}
          </p>
          {err && <p className="mt-1 text-[11px] text-atr-red">{err}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={open}
            disabled={pending}
            title={r.kind === "link" ? "Buka" : "Unduh"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-atr-fg-muted transition hover:bg-atr-bg-soft hover:text-atr-purple disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : r.kind === "link" ? (
              <ExternalLink className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                await togglePublishResource(r.id, !r.is_published);
                onChanged();
              })
            }
            disabled={pending}
            title={r.is_published ? "Sembunyikan (draft)" : "Terbitkan"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-atr-fg-muted transition hover:bg-atr-bg-soft hover:text-atr-fg disabled:opacity-50"
          >
            {r.is_published ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onEdit}
            title="Ubah"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-atr-fg-muted transition hover:bg-atr-bg-soft hover:text-atr-fg"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirm(`Hapus "${r.title}"?`)) return;
              startTransition(async () => {
                await deleteResource(r.id);
                onChanged();
              });
            }}
            disabled={pending}
            title="Hapus"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-atr-red transition hover:bg-atr-red/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

function ResourceForm({
  projectId,
  mode,
  editing,
  onClose,
  onDone,
}: {
  projectId: string;
  mode: "link" | "file";
  editing: ProjectResource | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [category, setCategory] = useState(editing?.category ?? "");
  const [url, setUrl] = useState(editing?.url ?? "");
  const [file, setFile] = useState<File | null>(null);

  const isFile = mode === "file";
  const isEdit = !!editing;

  function submit() {
    setErr(null);
    if (!title.trim()) {
      setErr("Judul wajib diisi.");
      return;
    }
    startTransition(async () => {
      // Edit: metadata only (+ url for links). File bytes are not re-uploaded.
      if (isEdit) {
        const r = await updateResource({
          id: editing.id,
          title: title.trim(),
          description: description.trim() || null,
          category: category || null,
          url: editing.kind === "link" ? url.trim() : null,
        });
        if ("error" in r) return setErr(r.error);
        return onDone();
      }

      if (isFile) {
        if (!file) return setErr("Pilih file dulu.");
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let bin = "";
        for (let i = 0; i < bytes.length; i++)
          bin += String.fromCharCode(bytes[i]);
        const base64 = btoa(bin);
        const r = await createFileResource({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          category: category || null,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          base64,
        });
        if ("error" in r) return setErr(r.error);
        return onDone();
      }

      const r = await createLinkResource({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        category: category || null,
        url: url.trim(),
      });
      if ("error" in r) return setErr(r.error);
      onDone();
    });
  }

  return (
    <div className="rounded-2xl border-2 border-atr-purple/30 bg-atr-purple-50/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-atr-fg">
          {isEdit
            ? "Ubah item"
            : isFile
              ? "Upload File Baru"
              : "Tambah Tautan Baru"}
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-atr-fg-muted hover:bg-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Judul (mis. Modul 1 - Digital Marketing)"
          className="w-full rounded-lg border border-atr-outline bg-white px-3 py-2 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
        />

        {mode === "link" && (
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://... (link Google Form, Drive, YouTube, dll)"
            className="w-full rounded-lg border border-atr-outline bg-white px-3 py-2 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        )}

        {isFile && !isEdit && (
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-atr-outline bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-atr-purple file:px-3 file:py-1 file:text-xs file:font-bold file:text-white"
          />
        )}

        <div className="flex flex-wrap gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-atr-outline bg-white px-3 py-2 text-sm outline-none focus:border-atr-purple"
          >
            <option value="">Kategori (opsional)</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Deskripsi singkat (opsional)"
          className="w-full rounded-lg border border-atr-outline bg-white px-3 py-2 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
        />

        {err && <p className="text-xs font-bold text-atr-red">{err}</p>}
        {isEdit && editing.kind === "file" && (
          <p className="text-[11px] text-atr-fg-muted">
            Untuk mengganti file, hapus item ini lalu upload ulang.
          </p>
        )}

        <div className="flex justify-end gap-2">
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
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {isEdit ? "Simpan" : "Tambah"}
          </button>
        </div>
      </div>
    </div>
  );
}
