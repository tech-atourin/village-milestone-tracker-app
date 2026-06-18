"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, Save, Check, Copy, KeyRound } from "lucide-react";
import { upsertUser } from "@/server/actions/users";

const ALL_ROLES = [
  { value: "peserta", label: "Peserta" },
  { value: "narasumber", label: "Narasumber" },
  { value: "mitra_admin", label: "Mitra Admin" },
  { value: "desa_wisata", label: "Desa Wisata" },
  { value: "superadmin", label: "Superadmin" },
] as const;

export type UserFormRole = (typeof ALL_ROLES)[number]["value"];

export type OrgOption = { id: string; name: string };

export type UserFormInitial = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  global_role: UserFormRole;
  organization_id: string | null;
};

/**
 * Reusable single-user create / edit dialog.
 *
 * - On atourin pages, pass `allowedRoles` = all (default).
 * - On mitra pages, pass `allowedRoles` = ["peserta", "narasumber"]
 *   and `forceOrgId` = the mitra's org so it's auto-scoped.
 */
export function UserFormDialog({
  open,
  onClose,
  allowedRoles,
  forceOrgId,
  orgOptions,
  initialRole,
  initialUser,
}: {
  open: boolean;
  onClose: () => void;
  allowedRoles?: ReadonlyArray<UserFormRole>;
  forceOrgId?: string;
  orgOptions: OrgOption[];
  initialRole?: UserFormRole;
  // When provided, dialog enters edit mode and updates this user in place.
  initialUser?: UserFormInitial | null;
}) {
  const isEdit = Boolean(initialUser);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<
    { email: string; password: string } | null
  >(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<{
    full_name: string;
    email: string;
    phone: string;
    global_role: UserFormRole;
    organization_id: string;
  }>({
    full_name: initialUser?.full_name ?? "",
    email: initialUser?.email ?? "",
    phone: initialUser?.phone ?? "",
    global_role: initialUser?.global_role ?? initialRole ?? "peserta",
    organization_id:
      initialUser?.organization_id ?? forceOrgId ?? "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        full_name: initialUser?.full_name ?? "",
        email: initialUser?.email ?? "",
        phone: initialUser?.phone ?? "",
        global_role: initialUser?.global_role ?? initialRole ?? "peserta",
        organization_id:
          initialUser?.organization_id ?? forceOrgId ?? "",
      });
      setError(null);
      setCredentials(null);
      setCopied(false);
    }
  }, [open, initialRole, forceOrgId, initialUser]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const roles = allowedRoles ?? ALL_ROLES.map((r) => r.value);
  const roleOptions = ALL_ROLES.filter((r) => roles.includes(r.value));

  function submit() {
    if (!form.full_name.trim()) {
      setError("Nama lengkap wajib diisi");
      return;
    }
    setError(null);
    const email = form.email.trim() || null;
    startTransition(async () => {
      const r = await upsertUser({
        id: initialUser?.id ?? null,
        full_name: form.full_name.trim(),
        email,
        phone: form.phone.trim() || null,
        global_role: form.global_role,
        organization_id:
          forceOrgId ?? (form.organization_id ? form.organization_id : null),
      });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      if (r.generated_password && email) {
        setCredentials({ email, password: r.generated_password });
        router.refresh();
        return;
      }
      onClose();
      router.refresh();
    });
  }

  async function copyCreds() {
    if (!credentials) return;
    await navigator.clipboard.writeText(
      `Email: ${credentials.email}\nPassword: ${credentials.password}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function closeCreds() {
    setCredentials(null);
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
        {credentials ? (
          <div className="space-y-4">
            <header>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-atr-arti/15 text-atr-arti">
                <Check className="h-5 w-5" />
              </div>
              <h2 className="mt-2 text-lg font-bold text-atr-fg">
                User berhasil dibuat
              </h2>
              <p className="text-xs text-atr-fg-muted">
                Berikan kredensial login berikut ke user. Password tidak akan
                ditampilkan lagi setelah dialog ini ditutup.
              </p>
            </header>
            <div className="rounded-2xl border border-atr-yellow/40 bg-atr-yellow/10 p-4 font-mono text-sm">
              <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                Email
              </div>
              <div className="mt-1 break-all text-atr-fg">
                {credentials.email}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Password awal
                </span>
                <KeyRound className="h-3.5 w-3.5 text-atr-fg-muted" />
              </div>
              <div className="mt-1 break-all text-atr-fg">
                {credentials.password}
              </div>
            </div>
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
                onClick={closeCreds}
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
                  {isEdit ? "Edit User" : "Tambah User Baru"}
                </h2>
                <p className="text-xs text-atr-fg-muted">
                  {isEdit
                    ? "Ubah data profil user. Untuk ubah email login atau reset password, buka halaman detail user."
                    : "Isi email untuk auto-generate akun login. Tanpa email = user hanya jadi profil (tidak bisa login)."}
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
                  value={form.full_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, full_name: e.target.value }))
                  }
                  placeholder="Eko Haryanto"
                  className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                />
              </Field>
              <Field label="Email (untuk login)">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="eko@example.com"
                  disabled={isEdit}
                  className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15 disabled:bg-atr-bg-soft disabled:text-atr-fg-muted"
                />
                {isEdit && (
                  <p className="mt-1 text-[10px] italic text-atr-fg-muted">
                    Ubah email login lewat halaman detail user.
                  </p>
                )}
              </Field>
              <Field label="No. HP / WA">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="081234567890"
                  className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                />
              </Field>
              <Field label="Role" required>
                <select
                  value={form.global_role}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      global_role: e.target.value as UserFormRole,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                >
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
              {!forceOrgId &&
                (form.global_role === "mitra_admin" ||
                  form.global_role === "peserta" ||
                  form.global_role === "narasumber") &&
                orgOptions.length > 0 && (
                  <Field label="Organisasi (opsional)">
                    <select
                      value={form.organization_id}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          organization_id: e.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                    >
                      <option value="">Tidak terkait organisasi</option>
                      {orgOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
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
                disabled={pending || !form.full_name.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {isEdit ? "Simpan Perubahan" : "Tambah User"}
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
