"use client";

import Link from "next/link";
import {
  Award,
  ExternalLink,
  MessageSquare,
  ClipboardCheck,
  Hourglass,
} from "lucide-react";

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
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-atr-arti/15">
          <ClipboardCheck className="h-5 w-5 text-atr-arti" />
        </div>
        <p className="text-sm font-bold text-atr-fg">
          Tidak ada assessment menunggu verifikasi
        </p>
        <p className="mt-1 text-xs text-atr-fg-muted">
          Submit baru dari desa akan muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <article
          key={r.id}
          className="rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-atr-fg">{r.desa_name}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-atr-fg-muted">
                <span className="text-atr-fg-muted">Skor:</span>
                <span className="font-bold text-atr-fg">
                  {r.skor_total != null ? `${r.skor_total.toFixed(1)}%` : "-"}
                </span>
                {r.level_hasil && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      TIER_COLOR[r.level_hasil] ?? "bg-atr-bg-soft text-atr-fg"
                    }`}
                  >
                    <Award className="h-3 w-3" />
                    {r.level_hasil}
                  </span>
                )}
              </div>
              {r.submitted_at && (
                <p className="mt-1 text-[11px] text-atr-fg-muted">
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
                href={`/atourin/desa/${r.desa_id}?from=${encodeURIComponent("/atourin/klasifikasi")}`}
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

          <div className="mt-4 flex justify-end">
            <Link
              href={`/atourin/klasifikasi/v2/${r.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-atr-purple px-3 text-xs font-bold text-white hover:bg-atr-purple-600"
            >
              <Hourglass className="h-3 w-3" />
              Review
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
