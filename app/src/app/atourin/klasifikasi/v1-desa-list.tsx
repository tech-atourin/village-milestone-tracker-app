"use client";

import Link from "next/link";
import { ClipboardCheck, MapPin, Award, ArrowRight } from "lucide-react";
import type { V1DesaQueueRow } from "@/server/queries/self-assessment";

const TIER_BADGE: Record<string, string> = {
  rintisan: "bg-atr-yellow/20 text-atr-fg",
  berkembang: "bg-atr-arti/15 text-atr-arti",
  maju: "bg-atr-purple-50 text-atr-purple-600",
  mandiri: "bg-atr-purple-light/60 text-atr-purple-800",
  unclassified: "bg-atr-bg-soft text-atr-fg-muted",
};
const TIER_LABEL: Record<string, string> = {
  rintisan: "Rintisan",
  berkembang: "Berkembang",
  maju: "Maju",
  mandiri: "Mandiri",
  unclassified: "Belum",
};

function fmtDate(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function V1DesaList({ rows }: { rows: V1DesaQueueRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
        <ClipboardCheck className="mx-auto mb-3 h-6 w-6 text-atr-arti" />
        <p className="text-sm font-bold text-atr-fg">
          Belum ada desa yang mengisi self-assessment V1
        </p>
        <p className="mt-1 text-xs text-atr-fg-muted">
          Desa wisata harus submit minimal 1 kriteria sebelum muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li
          key={r.desa_id}
          className="rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-atr-fg">
                  {r.desa_name}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    TIER_BADGE[r.current_classification] ?? ""
                  }`}
                >
                  <Award className="h-3 w-3" />
                  {TIER_LABEL[r.current_classification] ?? r.current_classification}
                </span>
              </div>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-atr-fg-muted">
                <MapPin className="h-3 w-3" />
                {[r.kabupaten, r.provinsi].filter(Boolean).join(", ") || "-"}
                {r.last_submitted_at && (
                  <> · submit terakhir {fmtDate(r.last_submitted_at)}</>
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-atr-fg-muted">
                <span className="inline-flex items-center gap-1">
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                      r.pending_count > 0
                        ? "bg-atr-yellow/30 text-atr-fg"
                        : "bg-atr-bg-soft text-atr-fg-muted"
                    }`}
                  >
                    {r.pending_count}
                  </span>
                  menunggu review
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-atr-arti/15 px-1.5 text-[10px] font-bold text-atr-arti">
                    {r.verified_count}
                  </span>
                  terverifikasi
                </span>
                {r.rejected_count > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-atr-red/15 px-1.5 text-[10px] font-bold text-atr-red">
                      {r.rejected_count}
                    </span>
                    ditolak
                  </span>
                )}
              </div>
            </div>
            <Link
              href={`/atourin/klasifikasi/v1/${r.desa_id}`}
              className="inline-flex h-9 items-center gap-1 rounded-md bg-atr-purple px-3 text-xs font-bold text-white hover:bg-atr-purple-600"
            >
              Review per Kriteria
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
