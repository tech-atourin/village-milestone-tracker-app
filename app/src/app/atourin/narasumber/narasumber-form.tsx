"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, Save, Trash2 } from "lucide-react";
import {
  upsertNarasumber,
  deleteNarasumber,
} from "@/server/actions/narasumber";

export type NarasumberFormValue = {
  id?: string;
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  jabatan?: string | null;
  instansi?: string | null;
  kota?: string | null;
  gender?: "L" | "P" | null;
  kategori_narasumber?: string | null;
  kompetensi?: string | null;
};

const KATEGORI_LABEL: Record<string, string> = {
  praktisi: "Praktisi",
  akademisi: "Akademisi",
  profesional: "Profesional",
  pns: "PNS",
  lainnya: "Lain-lain",
};

export function NarasumberFormDialog({
  open,
  onClose,
  value,
  kategoriOptions,
  kompetensiOptions,
}: {
  open: boolean;
  onClose: () => void;
  value: NarasumberFormValue | null;
  kategoriOptions: string[];
  kompetensiOptions: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyAction, setBusyAction] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<NarasumberFormValue>({
    full_name: "",
    email: null,
    phone: null,
    jabatan: null,
    instansi: null,
    kota: null,
    gender: null,
    kategori_narasumber: null,
    kompetensi: null,
  });
  const [katMode, setKatMode] = useState<"existing" | "new">("existing");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && value) {
      setForm(value);
      const initialKat = value.kategori_narasumber ?? null;
      if (initialKat && !kategoriOptions.includes(initialKat)) setKatMode("new");
      else setKatMode("existing");
      setError(null);
    }
    if (open && !value) {
      setForm({
        full_name: "",
        email: null,
        phone: null,
        jabatan: null,
        instansi: null,
        kota: null,
        gender: null,
        kategori_narasumber: null,
        kompetensi: null,
      });
      setKatMode("existing");
      setError(null);
    }
  }, [open, value, kategoriOptions]);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function setField<K extends keyof NarasumberFormValue>(
    key: K,
    val: NarasumberFormValue[K],
  ) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function submit() {
    setError(null);
    setBusyAction("save");
    startTransition(async () => {
      const r = await upsertNarasumber({
        id: form.id ?? null,
        full_name: (form.full_name ?? "").trim(),
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        jabatan: form.jabatan?.trim() || null,
        instansi: form.instansi?.trim() || null,
        kota: form.kota?.trim() || null,
        gender: form.gender ?? null,
        kategori_narasumber: form.kategori_narasumber?.trim() || null,
        kompetensi: form.kompetensi?.trim() || null,
      });
      setBusyAction(null);
      if ("error" in r && r.error) setError(r.error);
      else {
        onClose();
        router.refresh();
      }
    });
  }

  function remove() {
    if (!form.id) return;
    if (!confirm(`Hapus narasumber "${form.full_name}"? Aksi ini bisa di-undo lewat DB.`)) return;
    setError(null);
    setBusyAction("delete");
    startTransition(async () => {
      const r = await deleteNarasumber(form.id!);
      setBusyAction(null);
      if ("error" in r && r.error) setError(r.error);
      else {
        onClose();
        router.refresh();
      }
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
      <div
        ref={dialogRef}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-atr-outline bg-white p-6 shadow-2xl"
      >
        <header className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-atr-fg">
              {form.id ? "Edit Narasumber" : "Tambah Narasumber Baru"}
            </h2>
            <p className="text-xs text-atr-fg-muted">
              {form.id
                ? "Update profil narasumber. Perubahan langsung berlaku di seluruh project."
                : "Tambah mentor / narasumber ke pool agar bisa di-assign ke sesi pendampingan."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-atr-fg-muted hover:bg-atr-bg-soft hover:text-atr-fg"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3">
          <Field label="Nama lengkap" required>
            <input
              type="text"
              value={form.full_name ?? ""}
              onChange={(e) => setField("full_name", e.target.value)}
              placeholder="Contoh: Dr. Ratna Hapsari M.Si"
              className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email">
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setField("email", e.target.value || null)}
                placeholder="ratna@example.com"
                className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              />
            </Field>
            <Field label="No. HP / WA">
              <input
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) => setField("phone", e.target.value || null)}
                placeholder="081234567890"
                className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Jabatan">
              <input
                type="text"
                value={form.jabatan ?? ""}
                onChange={(e) => setField("jabatan", e.target.value || null)}
                placeholder="Dosen / Konsultan / Direktur"
                className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              />
            </Field>
            <Field label="Instansi">
              <input
                type="text"
                value={form.instansi ?? ""}
                onChange={(e) => setField("instansi", e.target.value || null)}
                placeholder="UGM / Atourin / Kemenparekraf"
                className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kota domisili">
              <input
                type="text"
                value={form.kota ?? ""}
                onChange={(e) => setField("kota", e.target.value || null)}
                placeholder="Yogyakarta"
                className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              />
            </Field>
            <Field label="Gender">
              <select
                value={form.gender ?? ""}
                onChange={(e) =>
                  setField(
                    "gender",
                    (e.target.value as "L" | "P") || null,
                  )
                }
                className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              >
                <option value="">Tidak disebutkan</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </Field>
          </div>

          <Field label="Kategori narasumber">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={
                  katMode === "existing"
                    ? form.kategori_narasumber ?? ""
                    : "__custom__"
                }
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setKatMode("new");
                    setField("kategori_narasumber", "");
                  } else {
                    setKatMode("existing");
                    setField(
                      "kategori_narasumber",
                      e.target.value || null,
                    );
                  }
                }}
                className="h-10 rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              >
                <option value="">Pilih dari daftar…</option>
                {kategoriOptions.map((k) => (
                  <option key={k} value={k}>
                    {KATEGORI_LABEL[k] ?? k}
                  </option>
                ))}
                <option value="__custom__">+ Tambah kategori baru</option>
              </select>
              {katMode === "new" && (
                <input
                  type="text"
                  value={form.kategori_narasumber ?? ""}
                  onChange={(e) =>
                    setField(
                      "kategori_narasumber",
                      e.target.value || null,
                    )
                  }
                  placeholder="Nama kategori baru"
                  className="h-10 flex-1 rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                />
              )}
            </div>
          </Field>

          <Field label="Kompetensi / bidang ahli">
            <input
              type="text"
              list="kompetensi-suggestions"
              value={form.kompetensi ?? ""}
              onChange={(e) => setField("kompetensi", e.target.value || null)}
              placeholder="Contoh: Storytelling & branding desa wisata"
              className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
            <datalist id="kompetensi-suggestions">
              {kompetensiOptions.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
            <p className="mt-1 text-[11px] text-atr-fg-muted">
              Ketik bebas atau pilih dari saran ({kompetensiOptions.length}{" "}
              tersedia).
            </p>
          </Field>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
            {error}
          </div>
        )}

        <footer className="mt-5 flex flex-wrap items-center justify-between gap-2">
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
              Hapus
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || !(form.full_name ?? "").trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
            >
              {busyAction === "save" && pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {form.id ? "Simpan perubahan" : "Tambah narasumber"}
            </button>
          </div>
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
