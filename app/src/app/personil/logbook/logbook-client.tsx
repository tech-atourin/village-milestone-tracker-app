"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Loader2, Trash2, Pencil, ImagePlus, X, Check } from "lucide-react";
import { compressIfImage } from "@/lib/image-compress";
import {
  addLogbookEntry,
  updateLogbookEntry,
  deleteLogbookEntry,
  uploadLogbookMedia,
  deleteLogbookMedia,
} from "@/server/actions/personnel";
import type { LogbookEntry } from "@/server/queries/personnel";

export type PersonnelAssignment = {
  id: string;
  project_name: string;
  position: string;
  work_start: string | null;
  work_end: string | null;
  entries: LogbookEntry[];
};

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatTanggal(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const hari = HARI[dt.getUTCDay()];
  return `${hari}, ${d} ${BULAN[m - 1]} ${y}`;
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function LogbookClient({
  assignments,
}: {
  assignments: PersonnelAssignment[];
}) {
  const [activeId, setActiveId] = useState(assignments[0]?.id ?? "");
  const active = assignments.find((a) => a.id === activeId) ?? assignments[0];

  if (!active) {
    return (
      <div className="rounded-xl border border-atr-outline bg-white p-8 text-center text-atr-fg-muted">
        Anda belum ditugaskan sebagai personil di project mana pun.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {assignments.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {assignments.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveId(a.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                a.id === activeId
                  ? "border-atr-purple bg-atr-purple text-white"
                  : "border-atr-outline bg-white text-atr-fg"
              }`}
            >
              {a.project_name}
            </button>
          ))}
        </div>
      )}
      <AssignmentPanel assignment={active} />
    </div>
  );
}

function AssignmentPanel({ assignment }: { assignment: PersonnelAssignment }) {
  const router = useRouter();
  const [entryDate, setEntryDate] = useState("");
  const [agenda, setAgenda] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const addFileRef = useRef<HTMLInputElement>(null);

  const min = assignment.work_start ?? undefined;
  const max = assignment.work_end ?? undefined;

  function submit() {
    setError(null);
    if (!entryDate) {
      setError("Pilih tanggal terlebih dahulu");
      return;
    }
    if (!agenda.trim()) {
      setError("Isi deskripsi kegiatan");
      return;
    }
    startTransition(async () => {
      const res = await addLogbookEntry({
        project_personnel_id: assignment.id,
        entry_date: entryDate,
        agenda: agenda.trim(),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      // Unggah gambar (jika ada) ke agenda yang baru dibuat.
      if (res.id && files.length > 0) {
        for (const file of files) {
          const compressed = await compressIfImage(file);
          const base64 = await fileToBase64(compressed);
          await uploadLogbookMedia({
            logbook_id: res.id,
            base64,
            filename: compressed.name,
            mime_type: compressed.type || "image/jpeg",
          });
        }
      }
      setAgenda("");
      setFiles([]);
      if (addFileRef.current) addFileRef.current.value = "";
      router.refresh();
    });
  }

  // Kelompokkan entri per tanggal.
  const byDate = new Map<string, LogbookEntry[]>();
  for (const e of assignment.entries) {
    const arr = byDate.get(e.entry_date) ?? [];
    arr.push(e);
    byDate.set(e.entry_date, arr);
  }
  const dates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-atr-outline bg-white p-4">
        <p className="text-sm text-atr-fg-muted">
          {assignment.position} - {assignment.project_name}
        </p>
        {(assignment.work_start || assignment.work_end) && (
          <p className="mt-0.5 text-xs text-atr-fg-muted">
            Masa kerja: {assignment.work_start ? formatTanggal(assignment.work_start) : "?"} sampai{" "}
            {assignment.work_end ? formatTanggal(assignment.work_end) : "?"}
          </p>
        )}
      </div>

      {/* Form tambah agenda */}
      <div className="rounded-xl border border-atr-outline bg-white p-4 space-y-3">
        <h2 className="font-semibold text-atr-fg">Tambah Agenda Harian</h2>
        <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
          <div>
            <label className="mb-1 block text-xs font-medium text-atr-fg-muted">
              Tanggal
            </label>
            <input
              type="date"
              value={entryDate}
              min={min}
              max={max}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full rounded-lg border border-atr-outline px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-atr-fg-muted">
              Deskripsi Kegiatan
            </label>
            <textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={2}
              placeholder="Contoh: Koordinasi dengan tim lapangan dan penyusunan materi..."
              className="w-full rounded-lg border border-atr-outline px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Lampiran gambar (opsional) */}
        <div>
          <label className="mb-1 block text-xs font-medium text-atr-fg-muted">
            Gambar Dokumentasi (opsional)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => addFileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-atr-outline px-3 py-2 text-sm text-atr-fg-muted hover:bg-atr-bg-soft"
            >
              <ImagePlus className="h-4 w-4" />
              Pilih Gambar
            </button>
            {files.length > 0 && (
              <span className="text-xs text-atr-fg-muted">
                {files.length} gambar dipilih
              </span>
            )}
          </div>
          {files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <FilePreview
                  key={`${f.name}-${i}`}
                  file={f}
                  onRemove={() =>
                    setFiles((prev) => prev.filter((_, idx) => idx !== i))
                  }
                />
              ))}
            </div>
          )}
          <input
            ref={addFileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files)
                setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
            }}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-atr-purple px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Tambah Agenda
        </button>
      </div>

      {/* Daftar entri per tanggal */}
      {dates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-atr-outline bg-white p-8 text-center text-atr-fg-muted">
          Belum ada agenda. Mulai isi log book harian Anda di atas.
        </div>
      ) : (
        <div className="space-y-4">
          {dates.map((date) => (
            <div
              key={date}
              className="rounded-xl border border-atr-outline bg-white p-4"
            >
              <h3 className="mb-3 font-semibold text-atr-fg">
                {formatTanggal(date)}
              </h3>
              <div className="space-y-3">
                {(byDate.get(date) ?? []).map((entry) => (
                  <EntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Thumbnail preview untuk file yang dipilih (sebelum diunggah).
function FilePreview({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="group relative">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={file.name}
          className="h-20 w-20 rounded-lg border border-atr-outline object-cover"
        />
      ) : (
        <div className="h-20 w-20 rounded-lg border border-atr-outline bg-atr-bg-soft" />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white opacity-0 group-hover:opacity-100"
        title="Hapus"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function EntryRow({ entry }: { entry: LogbookEntry }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.agenda);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function saveEdit() {
    startTransition(async () => {
      const res = await updateLogbookEntry({ id: entry.id, agenda: draft });
      if (!res.error) {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function del() {
    if (!confirm("Hapus agenda ini beserta gambarnya?")) return;
    startTransition(async () => {
      await deleteLogbookEntry({ id: entry.id });
      router.refresh();
    });
  }

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const compressed = await compressIfImage(file);
        const base64 = await fileToBase64(compressed);
        await uploadLogbookMedia({
          logbook_id: entry.id,
          base64,
          filename: compressed.name,
          mime_type: compressed.type || "image/jpeg",
        });
      }
      router.refresh();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeMedia(id: string) {
    startTransition(async () => {
      await deleteLogbookMedia({ id });
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-atr-outline/70 bg-atr-bg-soft p-3">
      <div className="flex items-start justify-between gap-3">
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-atr-outline px-3 py-2 text-sm"
          />
        ) : (
          <p className="flex-1 whitespace-pre-wrap text-sm text-atr-fg">
            {entry.agenda}
          </p>
        )}
        <div className="flex shrink-0 gap-1">
          {editing ? (
            <>
              <button
                onClick={saveEdit}
                disabled={pending}
                className="rounded p-1.5 text-green-600 hover:bg-green-50"
                title="Simpan"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setDraft(entry.agenda);
                }}
                className="rounded p-1.5 text-atr-fg-muted hover:bg-atr-outline/20"
                title="Batal"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="rounded p-1.5 text-atr-fg-muted hover:bg-atr-outline/20"
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={del}
                disabled={pending}
                className="rounded p-1.5 text-red-500 hover:bg-red-50"
                title="Hapus"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Media */}
      <div className="mt-3 flex flex-wrap gap-2">
        {entry.media.map((m) => (
          <div key={m.id} className="group relative">
            {m.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.url}
                alt={m.original_filename ?? "Evidence"}
                className="h-20 w-20 rounded-lg border border-atr-outline object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-atr-outline text-xs text-atr-fg-muted">
                gambar
              </div>
            )}
            <button
              onClick={() => removeMedia(m.id)}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white opacity-0 group-hover:opacity-100"
              title="Hapus gambar"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-atr-outline text-xs text-atr-fg-muted hover:bg-white disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-4 w-4" />
              <span>Gambar</span>
            </>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onPickFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
