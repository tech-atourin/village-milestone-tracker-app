"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import {
  verifyHubAssessment,
  rejectHubAssessment,
} from "@/server/actions/hub-verify";

/**
 * Verify / reject action bar for the V2 hub assessment viewer.
 * Mirrors the V1 review buttons. Only rendered for superadmin when the
 * submission is awaiting review (status === "submitted").
 */
export function HubVerifyBar({
  assessmentId,
  desaName,
  levelHasil,
}: {
  assessmentId: string;
  desaName: string;
  levelHasil: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"verify" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function approve() {
    if (
      !confirm(
        `Verifikasi assessment ${desaName}? Klasifikasi desa akan otomatis di-update ke ${levelHasil ?? "level hasil"}.`,
      )
    )
      return;
    setError(null);
    setBusy("verify");
    startTransition(async () => {
      const r = await verifyHubAssessment({
        assessment_id: assessmentId,
        note: note || null,
      });
      setBusy(null);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  function reject() {
    if (!note.trim()) {
      setError("Catatan revisi wajib diisi sebelum menolak.");
      return;
    }
    setError(null);
    setBusy("reject");
    startTransition(async () => {
      const r = await rejectHubAssessment({
        assessment_id: assessmentId,
        note,
      });
      setBusy(null);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <article className="rounded-2xl border border-atr-purple/30 bg-white p-4 shadow-atr-1">
      <h3 className="text-sm font-bold text-atr-fg">Tindakan Verifikasi</h3>
      <p className="mt-0.5 text-xs text-atr-fg-muted">
        Approve untuk promosikan klasifikasi desa, atau tolak dengan catatan
        revisi untuk dikembalikan ke desa.
      </p>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Catatan verifikasi (opsional untuk approve, wajib untuk tolak)…"
        className="mt-3 w-full rounded-lg border border-atr-outline bg-white p-2.5 text-xs outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
      />

      {error && (
        <div className="mt-2 rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
          {error}
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={reject}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-atr-red/30 bg-white px-3 text-xs font-bold text-atr-red transition hover:bg-atr-red/10 disabled:opacity-50"
        >
          {busy === "reject" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          Tolak & Minta Revisi
        </button>
        <button
          type="button"
          onClick={approve}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1 rounded-md bg-atr-arti px-3 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {busy === "verify" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Verifikasi & Promosikan
        </button>
      </div>
    </article>
  );
}
