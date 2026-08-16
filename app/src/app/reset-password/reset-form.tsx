"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";
import {
  resetPasswordWithSession,
  type ResetPasswordResult,
} from "@/server/actions/account";

export function ResetPasswordForm() {
  const router = useRouter();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<ResetPasswordResult | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setState(null);
    startTransition(async () => {
      const res = await resetPasswordWithSession({ next, confirm });
      setState(res);
      if (res.ok) {
        setTimeout(() => router.replace("/login"), 2000);
      }
    });
  }

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-atr-arti/30 bg-atr-arti/10 p-4 text-sm text-atr-arti">
        <div className="flex items-center gap-2 font-bold">
          <CheckCircle2 className="h-4 w-4" />
          Password berhasil diperbarui
        </div>
        <p className="mt-1 text-atr-arti/90">
          Anda akan diarahkan ke halaman login…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {state?.error && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-4 py-3 text-sm text-atr-red">
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="next" className="block text-sm font-bold text-atr-fg">
          Password baru
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atr-fg-muted" />
          <input
            id="next"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="Minimal 8 karakter"
            className="h-12 w-full rounded-xl border border-atr-outline bg-white pl-10 pr-3 text-sm text-atr-fg outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        </div>
        {state?.fieldErrors?.next && (
          <p className="text-xs text-atr-red">{state.fieldErrors.next}</p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirm"
          className="block text-sm font-bold text-atr-fg"
        >
          Ulangi password baru
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atr-fg-muted" />
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Ketik ulang password"
            className="h-12 w-full rounded-xl border border-atr-outline bg-white pl-10 pr-3 text-sm text-atr-fg outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        </div>
        {state?.fieldErrors?.confirm && (
          <p className="text-xs text-atr-red">{state.fieldErrors.confirm}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-atr-purple px-5 text-sm font-bold text-white shadow-atr-1 transition hover:bg-atr-purple-600 disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? "Menyimpan…" : "Simpan password baru"}
      </button>
    </form>
  );
}
