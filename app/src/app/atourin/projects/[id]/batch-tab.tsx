"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Pencil, Trash2, Users } from "lucide-react";
import {
  saveBatch,
  deleteBatch,
  assignPesertaBatch,
} from "@/server/actions/batches";
import type { BatchRow } from "@/server/queries/batches";

export type BatchPeserta = {
  user_id: string;
  full_name: string;
  email: string | null;
  batch_id: string | null;
};

const BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
function fmt(iso: string | null): string {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${BULAN[m - 1]} ${y}`;
}

export function BatchTab({
  projectId,
  batches,
  peserta,
}: {
  projectId: string;
  batches: BatchRow[];
  peserta: BatchPeserta[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BatchRow | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-atr-fg">Batch / Gelombang</h2>
          <p className="text-sm text-atr-fg-muted">
            Kelompokkan peserta ke dalam batch dengan jadwal masing-masing.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm((v) => !v);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-atr-purple px-4 py-2 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          Tambah Batch
        </button>
      </div>

      {(showForm || editing) && (
        <BatchForm
          projectId={projectId}
          initial={editing}
          onDone={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {batches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-atr-outline bg-white p-8 text-center text-atr-fg-muted">
          Belum ada batch. Tambahkan batch/gelombang untuk mengelompokkan
          peserta.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-atr-outline bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-atr-fg">{b.name}</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditing(b);
                      setShowForm(false);
                    }}
                    className="rounded p-1 text-atr-fg-muted hover:bg-atr-bg-soft"
                    aria-label="Edit"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <DeleteBatchButton batchId={b.id} projectId={projectId} />
                </div>
              </div>
              <div className="mt-1 text-xs text-atr-fg-muted">
                {fmt(b.start_date)} - {fmt(b.end_date)}
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 font-medium text-atr-fg">
                  <Users className="h-3.5 w-3.5" />
                  {b.peserta_count}
                  {b.quota != null ? ` / ${b.quota}` : ""} peserta
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Penetapan peserta ke batch */}
      {batches.length > 0 && (
        <div className="rounded-xl border border-atr-outline bg-white">
          <div className="border-b border-atr-outline px-4 py-3 text-sm font-bold text-atr-fg">
            Tetapkan Peserta ke Batch
          </div>
          <div className="max-h-[480px] overflow-y-auto divide-y divide-atr-outline/60">
            {peserta.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-atr-fg-muted">
                Belum ada peserta di project ini.
              </div>
            ) : (
              peserta.map((p) => (
                <PesertaBatchRow
                  key={p.user_id}
                  projectId={projectId}
                  peserta={p}
                  batches={batches}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BatchForm({
  projectId,
  initial,
  onDone,
}: {
  projectId: string;
  initial: BatchRow | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    start_date: initial?.start_date ?? "",
    end_date: initial?.end_date ?? "",
    quota: initial?.quota?.toString() ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Nama batch wajib diisi");
      return;
    }
    startTransition(async () => {
      const res = await saveBatch({
        id: initial?.id,
        project_id: projectId,
        name: form.name.trim(),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        quota: form.quota === "" ? null : Number(form.quota),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      onDone();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-atr-outline bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-atr-fg-muted">
          Nama Batch
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="mis. Batch 1"
            className="mt-1 w-full rounded-lg border border-atr-outline px-3 py-2 text-sm text-atr-fg outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        </label>
        <label className="text-xs font-medium text-atr-fg-muted">
          Kuota (opsional)
          <input
            type="number"
            min={0}
            value={form.quota}
            onChange={(e) => setForm({ ...form, quota: e.target.value })}
            className="mt-1 w-full rounded-lg border border-atr-outline px-3 py-2 text-sm text-atr-fg outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        </label>
        <label className="text-xs font-medium text-atr-fg-muted">
          Mulai
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="mt-1 w-full rounded-lg border border-atr-outline px-3 py-2 text-sm text-atr-fg outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        </label>
        <label className="text-xs font-medium text-atr-fg-muted">
          Selesai
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className="mt-1 w-full rounded-lg border border-atr-outline px-3 py-2 text-sm text-atr-fg outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-atr-purple px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial ? "Simpan Perubahan" : "Simpan Batch"}
        </button>
        <button
          onClick={onDone}
          className="rounded-lg border border-atr-outline px-4 py-2 text-sm font-medium text-atr-fg"
        >
          Batal
        </button>
      </div>
    </div>
  );
}

function DeleteBatchButton({
  batchId,
  projectId,
}: {
  batchId: string;
  projectId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => {
        if (
          !confirm(
            "Hapus batch ini? Peserta di batch ini akan jadi tanpa batch.",
          )
        )
          return;
        startTransition(async () => {
          await deleteBatch({ id: batchId, project_id: projectId });
          router.refresh();
        });
      }}
      disabled={pending}
      className="rounded p-1 text-red-500 hover:bg-red-50"
      aria-label="Hapus"
      title="Hapus"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function PesertaBatchRow({
  projectId,
  peserta,
  batches,
}: {
  projectId: string;
  peserta: BatchPeserta;
  batches: BatchRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(peserta.batch_id ?? "");

  function change(v: string) {
    setValue(v);
    startTransition(async () => {
      await assignPesertaBatch({
        project_id: projectId,
        user_id: peserta.user_id,
        batch_id: v || null,
      });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-atr-fg">
          {peserta.full_name}
        </div>
        {peserta.email && (
          <div className="truncate text-xs text-atr-fg-muted">
            {peserta.email}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {pending && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-atr-fg-muted" />
        )}
        <select
          value={value}
          onChange={(e) => change(e.target.value)}
          className="rounded-lg border border-atr-outline px-2 py-1.5 text-sm text-atr-fg outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
        >
          <option value="">Tanpa batch</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
