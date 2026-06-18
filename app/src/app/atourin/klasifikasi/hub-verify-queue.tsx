"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import {
  verifyHubAssessment,
  rejectHubAssessment,
} from "@/server/actions/hub-verify";

export type HubSubmissionRow = {
  id: string;
  desa_id: string;
  desa_name: string;
  level_hasil: string | null;
  skor_total: number | null;
  status: "draft" | "submitted" | "verified";
  submitted_at: string | null;
};

const TIER_COLOR: Record<string, string> = {
  Rintisan: "bg-atr-yellow/20 text-atr-fg",
  Berkembang: "bg-atr-arti/15 text-atr-arti",
  Maju: "bg-atr-purple-50 text-atr-purple-600",
  Mandiri: "bg-atr-purple-light/60 text-atr-purple-800",
};

export function HubVerifyQueue({
  rows,
  commentCountByAssessment,
}: {
  rows: HubSubmissionRow[];
  commentCountByAssessment?: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function approve(id: string) {
    if (
      !confirm(
        "Verifikasi assessment ini? Klasifikasi desa akan otomatis ter-update ke level hasil.",
      )
    )
      return;
    setErr(null);
    startTransition(async () => {
      const r = await verifyHubAssessment({ assessment_id: id, note: note || null });
      if (r.error) setErr(r.error);
      else {
        setOpenId(null);
        setNote("");
        router.refresh();
      }
    });
  }

  function reject(id: string) {
    if (!note.trim()) {
      setErr("Catatan revisi wajib diisi sebelum reject");
      return;
    }
    if (!confirm("Tolak assessment ini? Desa akan diminta revisi."))
      return;
    setErr(null);
    startTransition(async () => {
      const r = await rejectHubAssessment({ assessment_id: id, note });
      if (r.error) setErr(r.error);
      else {
        setOpenId(null);
        setNote("");
        router.refresh();
      }
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-atr-outline bg-atr-bg-soft p-8 text-center">
        <p className="text-sm font-bold text-atr-fg">
          Tidak ada submission Assessment Klasifikasi Desa V2 (Atourin) menunggu verifikasi
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <article
          key={r.id}
          className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-atr-fg">{r.desa_name}</h3>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="text-atr-fg-muted">Skor:</span>
                <span className="text-lg font-bold text-atr-fg">
                  {r.skor_total ?? "—"}%
                </span>
                {r.level_hasil && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${TIER_COLOR[r.level_hasil] ?? ""}`}
                  >
                    <Award className="h-3 w-3" />
                    {r.level_hasil}
                  </span>
                )}
              </div>
              {r.submitted_at && (
                <p className="mt-0.5 text-[11px] text-atr-fg-muted">
                  Disubmit{" "}
                  {new Intl.DateTimeFormat("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(r.submitted_at))}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Link
                href={`/atourin/desa/${r.desa_id}`}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-outline bg-white px-2.5 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft"
              >
                <ExternalLink className="h-3 w-3" />
                Detail Desa
              </Link>
              <Link
                href={`/atourin/klasifikasi/v2/${r.id}`}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-atr-outline bg-white px-2 text-[11px] font-bold text-atr-fg hover:bg-atr-bg-soft"
                title="Lihat jawaban + balas comment per pertanyaan"
              >
                <MessageSquare className="h-3 w-3" />
                Thread · {commentCountByAssessment?.[r.id] ?? 0}
              </Link>
            </div>
          </div>

          {openId === r.id ? (
            <div className="mt-4 space-y-2 rounded-lg border border-atr-purple/30 bg-atr-purple-50/30 p-3">
              <label className="block text-xs font-bold text-atr-fg">
                Catatan verifikasi (opsional untuk approve, wajib untuk reject)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="cth: Bagus, tinggal lengkapi dokumen SOP..."
                className="w-full rounded-md border border-atr-outline bg-white p-2 text-xs outline-none focus:border-atr-purple"
              />
              {err && (
                <div className="text-[11px] font-bold text-atr-red">{err}</div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(null);
                    setNote("");
                    setErr(null);
                  }}
                  className="h-8 rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => reject(r.id)}
                  disabled={pending}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-red/30 bg-white px-3 text-xs font-bold text-atr-red hover:bg-atr-red/5 disabled:opacity-50"
                >
                  {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                  Tolak & Minta Revisi
                </button>
                <button
                  type="button"
                  onClick={() => approve(r.id)}
                  disabled={pending}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-atr-arti px-3 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  Approve & Promote
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setOpenId(r.id)}
                className="inline-flex h-8 items-center gap-1 rounded-md bg-atr-purple px-3 text-xs font-bold text-white hover:bg-atr-purple-600"
              >
                Verifikasi
              </button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
