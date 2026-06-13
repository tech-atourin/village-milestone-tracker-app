"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Lock, Loader2, CheckCircle2, Save } from "lucide-react";
import { changePassword } from "@/server/actions/account";

export function ChangePasswordCard() {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"current" | "next" | "confirm", string>>
  >({});

  function submit() {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const r = await changePassword({ current, next, confirm });
      if (r.error) {
        setError(r.error);
      } else if (r.fieldErrors) {
        setFieldErrors(r.fieldErrors);
      } else if (r.ok) {
        setSuccess(true);
        setCurrent("");
        setNext("");
        setConfirm("");
        setTimeout(() => {
          setSuccess(false);
          setOpen(false);
        }, 2000);
      }
    });
  }

  if (!open) {
    return (
      <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4 text-atr-purple" />
            <div>
              <h2 className="text-sm font-bold text-atr-fg">Keamanan akun</h2>
              <p className="text-xs text-atr-fg-muted">
                Ganti password berkala untuk menjaga keamanan akun.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
          >
            Ganti password
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-atr-fg">
        <Lock className="h-4 w-4 text-atr-purple" />
        Ganti password
      </h2>

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-atr-arti/30 bg-atr-arti/10 p-3 text-sm text-atr-arti">
          <CheckCircle2 className="h-4 w-4" />
          Password berhasil diganti.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-atr-red/30 bg-atr-red/10 p-3 text-sm text-atr-red">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <Field
          label="Password lama"
          value={current}
          onChange={setCurrent}
          show={showPasswords}
          autoComplete="current-password"
          error={fieldErrors.current}
        />
        <Field
          label="Password baru"
          value={next}
          onChange={setNext}
          show={showPasswords}
          autoComplete="new-password"
          error={fieldErrors.next}
          hint="Minimal 8 karakter, kombinasi huruf + angka direkomendasikan."
        />
        <Field
          label="Konfirmasi password baru"
          value={confirm}
          onChange={setConfirm}
          show={showPasswords}
          autoComplete="new-password"
          error={fieldErrors.confirm}
        />

        <label className="flex cursor-pointer items-center gap-2 text-xs text-atr-fg-muted">
          <input
            type="checkbox"
            checked={showPasswords}
            onChange={(e) => setShowPasswords(e.target.checked)}
            className="h-3.5 w-3.5 accent-atr-purple"
          />
          Tampilkan password
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
              setFieldErrors({});
              setCurrent("");
              setNext("");
              setConfirm("");
            }}
            className="inline-flex h-10 items-center rounded-lg border border-atr-outline bg-white px-4 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !current || !next || !confirm}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Simpan
          </button>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  show,
  autoComplete,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  autoComplete: string;
  error?: string;
  hint?: string;
}) {
  const [localShow, setLocalShow] = useState(false);
  const visible = show || localShow;
  return (
    <div className="space-y-1">
      <label className="block text-sm font-bold text-atr-fg">{label}</label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="h-11 w-full rounded-lg border border-atr-outline bg-white px-3 pr-10 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
        />
        <button
          type="button"
          onClick={() => setLocalShow((s) => !s)}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-atr-fg-muted transition hover:text-atr-fg"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && !error && (
        <p className="text-xs text-atr-fg-muted">{hint}</p>
      )}
      {error && <p className="text-xs text-atr-red">{error}</p>}
    </div>
  );
}
