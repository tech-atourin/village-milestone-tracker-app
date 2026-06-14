"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, Save, Check, Copy, KeyRound, AlertTriangle } from "lucide-react";
import { createOrgWithAdmin } from "@/server/actions/orgs";

type AdminCreds = { email: string; password: string } | null;

export function OrgFormDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [creds, setCreds] = useState<AdminCreds>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: "",
    brand_color_primary: "#7068D5",
    create_admin: true,
    admin_full_name: "",
    admin_email: "",
    admin_phone: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: "",
        brand_color_primary: "#7068D5",
        create_admin: true,
        admin_full_name: "",
        admin_email: "",
        admin_phone: "",
      });
      setError(null);
      setWarning(null);
      setCreds(null);
      setCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function submit() {
    if (!form.name.trim()) {
      setError("Nama organisasi wajib diisi");
      return;
    }
    if (
      form.create_admin &&
      (!form.admin_full_name.trim() || !form.admin_email.trim())
    ) {
      setError("Nama + email admin wajib diisi jika create admin di-aktifkan");
      return;
    }
    setError(null);
    setWarning(null);
    startTransition(async () => {
      const r = await createOrgWithAdmin({
        name: form.name.trim(),
        brand_color_primary: form.brand_color_primary || null,
        admin_full_name: form.create_admin
          ? form.admin_full_name.trim()
          : null,
        admin_email: form.create_admin ? form.admin_email.trim() : null,
        admin_phone: form.create_admin ? form.admin_phone.trim() || null : null,
      });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      if (r.admin) {
        setCreds({ email: r.admin.email, password: r.admin.password });
        router.refresh();
        return;
      }
      if (form.create_admin && !r.admin) {
        setWarning(
          "Organisasi dibuat, tapi email admin sudah dipakai user lain. Tambahkan admin manual via menu Users.",
        );
        router.refresh();
        return;
      }
      router.refresh();
      onClose();
    });
  }

  async function copyCreds() {
    if (!creds) return;
    await navigator.clipboard.writeText(
      `Email: ${creds.email}\nPassword: ${creds.password}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function done() {
    setCreds(null);
    setCopied(false);
    onClose();
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
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-atr-outline bg-white p-6 shadow-2xl">
        {creds ? (
          <div className="space-y-4">
            <header>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-atr-arti/15 text-atr-arti">
                <Check className="h-5 w-5" />
              </div>
              <h2 className="mt-2 text-lg font-bold text-atr-fg">
                Organisasi & admin berhasil dibuat
              </h2>
              <p className="text-xs text-atr-fg-muted">
                Berikan kredensial berikut ke admin mitra. Password tidak akan
                ditampilkan lagi.
              </p>
            </header>
            <div className="rounded-2xl border border-atr-yellow/40 bg-atr-yellow/10 p-4 font-mono text-sm">
              <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                Email
              </div>
              <div className="mt-1 break-all text-atr-fg">{creds.email}</div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Password awal
                </span>
                <KeyRound className="h-3.5 w-3.5 text-atr-fg-muted" />
              </div>
              <div className="mt-1 break-all text-atr-fg">{creds.password}</div>
            </div>
            <p className="text-[11px] text-atr-fg-muted">
              💡 Admin login di <code className="rounded bg-atr-bg-soft px-1">/login</code>{" "}
              → diarahkan ke /mitra/dashboard.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={copyCreds}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg hover:bg-atr-bg-soft"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-atr-arti" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Tersalin" : "Salin email + password"}
              </button>
              <button
                type="button"
                onClick={done}
                className="inline-flex h-9 items-center rounded-lg bg-atr-purple px-4 text-sm font-bold text-white hover:bg-atr-purple-600"
              >
                Selesai
              </button>
            </div>
          </div>
        ) : (
          <>
            <header className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-atr-fg">
                  Tambah Organisasi
                </h2>
                <p className="text-xs text-atr-fg-muted">
                  Buat mitra baru. Opsional: auto-generate akun admin mitra
                  yang langsung bisa login.
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
              <Field label="Nama organisasi" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="cth: Kemenpar, Kementerian BUMN"
                  className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                />
              </Field>
              <Field label="Brand color primary">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.brand_color_primary}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        brand_color_primary: e.target.value,
                      }))
                    }
                    className="h-10 w-12 cursor-pointer rounded-lg border border-atr-outline bg-white p-1"
                    aria-label="Warna brand primary"
                  />
                  <input
                    type="text"
                    value={form.brand_color_primary}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        brand_color_primary: e.target.value,
                      }))
                    }
                    placeholder="#7068D5"
                    className="h-10 flex-1 rounded-lg border border-atr-outline bg-white px-3 font-mono text-sm outline-none focus:border-atr-purple"
                  />
                </div>
              </Field>

              <div className="rounded-xl border border-atr-purple/20 bg-atr-purple-50/30 p-3">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={form.create_admin}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        create_admin: e.target.checked,
                      }))
                    }
                    className="mt-0.5 accent-atr-purple"
                  />
                  <span>
                    <span className="block text-sm font-bold text-atr-fg">
                      Buat akun admin mitra sekaligus
                    </span>
                    <span className="block text-[11px] text-atr-fg-muted">
                      Auto-generate akun login mitra_admin dengan password
                      acak. Bisa di-skip dan ditambahkan manual nanti.
                    </span>
                  </span>
                </label>
              </div>

              {form.create_admin && (
                <div className="space-y-3 rounded-xl border border-atr-outline bg-atr-bg-soft p-3">
                  <Field label="Nama admin" required>
                    <input
                      type="text"
                      value={form.admin_full_name}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          admin_full_name: e.target.value,
                        }))
                      }
                      placeholder="cth: Budi Santoso"
                      className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                    />
                  </Field>
                  <Field label="Email admin" required>
                    <input
                      type="email"
                      value={form.admin_email}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          admin_email: e.target.value,
                        }))
                      }
                      placeholder="budi@mitra.go.id"
                      className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                    />
                  </Field>
                  <Field label="No. HP / WA">
                    <input
                      type="tel"
                      value={form.admin_phone}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          admin_phone: e.target.value,
                        }))
                      }
                      placeholder="081234567890"
                      className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                    />
                  </Field>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-3 rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
                {error}
              </div>
            )}
            {warning && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-atr-yellow/40 bg-atr-yellow/10 px-3 py-2 text-xs text-atr-fg">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-atr-yellow" />
                <span>{warning}</span>
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
                disabled={pending || !form.name.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Buat organisasi
              </button>
            </footer>
          </>
        )}
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
