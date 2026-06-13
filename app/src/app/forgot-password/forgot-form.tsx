"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Mail } from "lucide-react";
import { forgotPasswordAction, type ForgotResult } from "../login/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-atr-purple px-5 text-sm font-bold text-white shadow-atr-1 transition hover:bg-atr-purple-600 disabled:opacity-60"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Mengirim…" : "Kirim link reset"}
    </button>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useFormState<ForgotResult | null, FormData>(
    forgotPasswordAction,
    null,
  );

  if (state?.success) {
    return (
      <div className="rounded-lg border border-atr-arti/30 bg-atr-arti/10 p-4 text-sm text-atr-arti">
        Jika email tersebut terdaftar, link reset akan dikirim dalam beberapa
        menit. Cek juga folder spam.
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {state?.error && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-4 py-3 text-sm text-atr-red">
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-bold text-atr-fg"
        >
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atr-fg-muted" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="anda@organisasi.com"
            className="h-12 w-full rounded-xl border border-atr-outline bg-white pl-10 pr-3 text-sm text-atr-fg outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
