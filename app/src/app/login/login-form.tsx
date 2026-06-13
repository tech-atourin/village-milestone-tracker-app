"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { signInAction, type SignInResult } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-atr-purple px-5 text-sm font-bold text-white shadow-atr-1 transition hover:bg-atr-purple-600 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Memproses…
        </>
      ) : (
        <>
          Masuk
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </>
      )}
    </button>
  );
}

export function LoginForm() {
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "";
  const [state, action] = useFormState<SignInResult | null, FormData>(
    signInAction,
    null,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />

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
        {state?.fieldErrors?.email && (
          <p className="text-xs text-atr-red">{state.fieldErrors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-sm font-bold text-atr-fg"
          >
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-bold text-atr-purple hover:text-atr-purple-600"
          >
            Lupa password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atr-fg-muted" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="h-12 w-full rounded-xl border border-atr-outline bg-white pl-10 pr-12 text-sm text-atr-fg outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-atr-fg-muted transition hover:text-atr-fg"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {state?.fieldErrors?.password && (
          <p className="text-xs text-atr-red">{state.fieldErrors.password}</p>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}
