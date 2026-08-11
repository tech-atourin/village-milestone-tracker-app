"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Loader2,
  Trash2,
  Pencil,
  ArrowLeft,
  Printer,
  NotebookPen,
} from "lucide-react";
import {
  addPersonnel,
  updatePersonnel,
  removePersonnel,
} from "@/server/actions/personnel";
import type { PersonnelRow, LogbookEntry } from "@/server/queries/personnel";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
function formatTanggal(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${HARI[dt.getUTCDay()]}, ${d} ${BULAN[m - 1]} ${y}`;
}
function formatShort(iso: string | null): string {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${BULAN[m - 1]} ${y}`;
}

// =====================================================
// Daftar personil + form tambah (mode utama tab Log Book).
// =====================================================
export function LogbookAdminTab({
  projectId,
  personnel,
  basePath,
}: {
  projectId: string;
  personnel: PersonnelRow[];
  basePath: string; // e.g. /atourin/projects/{id} atau /mitra/projects/{id}
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-atr-fg">Log Book Personil</h2>
          <p className="text-sm text-atr-fg-muted">
            Tim pelaksana project mencatat agenda harian selama masa kerja.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-atr-purple px-4 py-2 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          Tambah Personil
        </button>
      </div>

      {showForm && (
        <AddPersonnelForm
          projectId={projectId}
          onDone={() => setShowForm(false)}
        />
      )}

      {personnel.length === 0 ? (
        <div className="rounded-xl border border-dashed border-atr-outline bg-white p-8 text-center text-atr-fg-muted">
          Belum ada personil. Tambahkan tim pelaksana project.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-atr-outline bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-atr-outline bg-atr-bg-soft text-left text-xs uppercase text-atr-fg-muted">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Posisi</th>
                <th className="px-4 py-3">Masa Kerja</th>
                <th className="px-4 py-3 text-center">Agenda</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {personnel.map((p) => (
                <PersonnelTableRow
                  key={p.id}
                  row={p}
                  projectId={projectId}
                  basePath={basePath}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddPersonnelForm({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    position: "",
    phone: "",
    work_start: "",
    work_end: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setOkMsg(null);
    if (!form.full_name || !form.email || !form.position) {
      setError("Nama, email, dan posisi wajib diisi");
      return;
    }
    startTransition(async () => {
      const res = await addPersonnel({
        project_id: projectId,
        full_name: form.full_name,
        email: form.email,
        position: form.position,
        phone: form.phone || null,
        work_start: form.work_start || null,
        work_end: form.work_end || null,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setOkMsg(
        res.password
          ? `Personil ditambahkan. Akun baru dibuat - password: ${res.password}`
          : "Personil ditambahkan (memakai akun yang sudah ada).",
      );
      setForm({
        full_name: "",
        email: "",
        position: "",
        phone: "",
        work_start: "",
        work_end: "",
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-atr-outline bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nama Lengkap">
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Email (untuk login)">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Posisi / Jabatan">
          <input
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="No. Telepon (opsional)">
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Mulai Kerja">
          <input
            type="date"
            value={form.work_start}
            onChange={(e) => setForm({ ...form, work_start: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Selesai Kerja">
          <input
            type="date"
            value={form.work_end}
            onChange={(e) => setForm({ ...form, work_end: e.target.value })}
            className="input"
          />
        </Field>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {okMsg && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {okMsg}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-atr-purple px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan Personil
        </button>
        <button
          onClick={onDone}
          className="rounded-lg border border-atr-outline px-4 py-2 text-sm font-medium text-atr-fg"
        >
          Tutup
        </button>
      </div>
      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--atr-outline, #e2e2e2);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-atr-fg-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function PersonnelTableRow({
  row,
  projectId,
  basePath,
}: {
  row: PersonnelRow;
  projectId: string;
  basePath: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    position: row.position,
    phone: row.phone ?? "",
    work_start: row.work_start ?? "",
    work_end: row.work_end ?? "",
  });

  function save() {
    startTransition(async () => {
      const res = await updatePersonnel({
        id: row.id,
        project_id: projectId,
        position: draft.position,
        phone: draft.phone || null,
        work_start: draft.work_start || null,
        work_end: draft.work_end || null,
      });
      if (!res.error) {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function remove() {
    if (!confirm(`Keluarkan ${row.full_name} dari project? Log book-nya ikut terhapus.`))
      return;
    startTransition(async () => {
      await removePersonnel({ id: row.id, project_id: projectId });
      router.refresh();
    });
  }

  if (editing) {
    return (
      <tr className="border-b border-atr-outline/60 align-top">
        <td className="px-4 py-3">
          <div className="font-medium text-atr-fg">{row.full_name}</div>
          <div className="text-xs text-atr-fg-muted">{row.email}</div>
        </td>
        <td className="px-4 py-3">
          <input
            value={draft.position}
            onChange={(e) => setDraft({ ...draft, position: e.target.value })}
            className="w-full rounded border border-atr-outline px-2 py-1 text-sm"
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <input
              type="date"
              value={draft.work_start}
              onChange={(e) =>
                setDraft({ ...draft, work_start: e.target.value })
              }
              className="rounded border border-atr-outline px-2 py-1 text-xs"
            />
            <input
              type="date"
              value={draft.work_end}
              onChange={(e) => setDraft({ ...draft, work_end: e.target.value })}
              className="rounded border border-atr-outline px-2 py-1 text-xs"
            />
          </div>
        </td>
        <td className="px-4 py-3 text-center">{row.entry_count}</td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-1">
            <button
              onClick={save}
              disabled={pending}
              className="rounded bg-atr-purple px-3 py-1 text-xs font-medium text-white"
            >
              {pending ? "..." : "Simpan"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded border border-atr-outline px-3 py-1 text-xs"
            >
              Batal
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-atr-outline/60">
      <td className="px-4 py-3">
        <div className="font-medium text-atr-fg">{row.full_name}</div>
        <div className="text-xs text-atr-fg-muted">{row.email}</div>
      </td>
      <td className="px-4 py-3">{row.position}</td>
      <td className="px-4 py-3 text-xs text-atr-fg-muted">
        {formatShort(row.work_start)} - {formatShort(row.work_end)}
      </td>
      <td className="px-4 py-3 text-center font-medium">{row.entry_count}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <Link
            href={`${basePath}?tab=logbook&pp=${row.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-atr-outline px-3 py-1.5 text-xs font-medium text-atr-fg hover:bg-atr-bg-soft"
          >
            <NotebookPen className="h-3.5 w-3.5" />
            Lihat Log Book
          </Link>
          <button
            onClick={() => setEditing(true)}
            className="rounded p-1.5 text-atr-fg-muted hover:bg-atr-bg-soft"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={remove}
            disabled={pending}
            className="rounded p-1.5 text-red-500 hover:bg-red-50"
            title="Keluarkan"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// =====================================================
// Detail log book satu personil (tabel siap cetak).
// =====================================================
export function LogbookAdminDetail({
  person,
  entries,
  backPath,
}: {
  person: PersonnelRow;
  entries: LogbookEntry[];
  backPath: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={backPath}
          className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke daftar personil
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg border border-atr-outline px-4 py-2 text-sm font-medium text-atr-fg"
        >
          <Printer className="h-4 w-4" />
          Cetak
        </button>
      </div>

      <div className="rounded-xl border border-atr-outline bg-white p-5">
        <h2 className="text-lg font-bold text-atr-fg">Log Book Personil</h2>
        <div className="mt-1 text-sm text-atr-fg-muted">
          <div>
            <span className="font-medium text-atr-fg">{person.full_name}</span>{" "}
            - {person.position}
          </div>
          <div>
            Masa kerja: {formatShort(person.work_start)} sampai{" "}
            {formatShort(person.work_end)}
          </div>
        </div>

        {entries.length === 0 ? (
          <p className="mt-4 text-sm text-atr-fg-muted">
            Personil ini belum mengisi agenda apa pun.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-atr-outline text-left text-xs uppercase text-atr-fg-muted">
                  <th className="w-56 px-3 py-2">Hari / Tanggal</th>
                  <th className="px-3 py-2">Deskripsi Kegiatan</th>
                  <th className="w-64 px-3 py-2">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-atr-outline/60 align-top"
                  >
                    <td className="px-3 py-3 text-atr-fg">
                      {formatTanggal(e.entry_date)}
                    </td>
                    <td className="px-3 py-3 whitespace-pre-wrap text-atr-fg">
                      {e.agenda}
                    </td>
                    <td className="px-3 py-3">
                      {e.media.length === 0 ? (
                        <span className="text-xs text-atr-fg-muted">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {e.media.map((m) =>
                            m.url ? (
                              <a
                                key={m.id}
                                href={m.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={m.url}
                                  alt={m.original_filename ?? "Evidence"}
                                  className="h-16 w-16 rounded border border-atr-outline object-cover"
                                />
                              </a>
                            ) : null,
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
