"use client";

import { useState, useTransition } from "react";
import {
  Loader2,
  KeyRound,
  Mail,
  Save,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";
import { updateUserEmail, resetUserPassword } from "@/server/actions/users";

export function UserDetailAuth({
  userId,
  initialEmail,
}: {
  userId: string;
  initialEmail: string | null;
}) {
  const [pendingEmail, startEmailTx] = useTransition();
  const [pendingReset, startResetTx] = useTransition();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [emailMsg, setEmailMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [resetErr, setResetErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function submitEmail() {
    setEmailMsg(null);
    startEmailTx(async () => {
      const r = await updateUserEmail({ id: userId, email });
      if ("error" in r) setEmailMsg({ type: "err", text: r.error });
      else setEmailMsg({ type: "ok", text: "Email berhasil diupdate." });
    });
  }

  function doReset() {
    setResetErr(null);
    setNewPassword(null);
    if (!confirm("Reset password user ini? Password baru akan ditampilkan sekali saja."))
      return;
    startResetTx(async () => {
      const r = await resetUserPassword(userId);
      if ("error" in r) setResetErr(r.error);
      else setNewPassword(r.password);
    });
  }

  async function copyCredentials() {
    if (!newPassword) return;
    await navigator.clipboard.writeText(
      `Email: ${email}\nPassword: ${newPassword}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-purple">
          <Mail className="h-4 w-4" />
          Ubah Email Login
        </h3>
        <div className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="h-10 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
          <p className="text-[11px] text-atr-fg-muted">
            Email ini dipakai untuk login. Mengubahnya akan langsung berlaku
            tanpa konfirmasi email.
          </p>
          <div className="flex items-center justify-between gap-3">
            {emailMsg ? (
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold ${
                  emailMsg.type === "ok" ? "text-atr-arti" : "text-atr-red"
                }`}
              >
                {emailMsg.type === "ok" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
                {emailMsg.text}
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={submitEmail}
              disabled={pendingEmail || !email || email === (initialEmail ?? "")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
            >
              {pendingEmail ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Simpan Email
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-purple">
          <KeyRound className="h-4 w-4" />
          Reset Password
        </h3>
        <p className="mb-3 text-xs text-atr-fg-muted">
          Generate password baru. Password lama akan langsung tidak berlaku.
          Password baru hanya ditampilkan sekali — pastikan langsung dicopy
          atau dicatat untuk dikirim ke user.
        </p>
        {newPassword ? (
          <div className="space-y-3 rounded-xl border border-atr-arti/30 bg-atr-arti/5 p-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
                Email
              </div>
              <div className="mt-0.5 font-mono text-sm text-atr-fg">{email}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
                Password baru
              </div>
              <div className="mt-0.5 font-mono text-lg font-bold text-atr-fg">
                {newPassword}
              </div>
            </div>
            <button
              type="button"
              onClick={copyCredentials}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-atr-arti" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Tersalin" : "Salin email + password"}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            {resetErr && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-atr-red">
                <AlertCircle className="h-3.5 w-3.5" />
                {resetErr}
              </span>
            )}
            <button
              type="button"
              onClick={doReset}
              disabled={pendingReset || !initialEmail}
              className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
            >
              {pendingReset ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <KeyRound className="h-3.5 w-3.5" />
              )}
              Generate Password Baru
            </button>
          </div>
        )}
        {!initialEmail && (
          <p className="mt-2 text-[11px] italic text-atr-fg-muted">
            User belum punya email — atur email dulu untuk bisa reset password.
          </p>
        )}
      </section>
    </div>
  );
}
