"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ClipboardCheck,
} from "lucide-react";
import { verifyCriteriaItem } from "@/server/actions/self-assessment";

type Item = {
  progress_id: string;
  status: string;
  submitted_at: string | null;
  desa: { id: string; name: string };
  criteria: { title: string; category: string; tier: string; required: boolean };
};

const TIER_COLOR: Record<string, string> = {
  rintisan: "bg-atr-yellow/20 text-atr-fg",
  berkembang: "bg-atr-arti/15 text-atr-arti",
  maju: "bg-atr-purple-50 text-atr-purple-600",
  mandiri: "bg-atr-purple-light/60 text-atr-purple-800",
};

export function VerificationQueue({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function decide(id: string, decision: "verified" | "rejected") {
    startTransition(async () => {
      const r = await verifyCriteriaItem({
        progress_id: id,
        decision,
      });
      if (r.error) alert(r.error);
      else router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
        <ClipboardCheck className="mx-auto mb-3 h-6 w-6 text-atr-arti" />
        <p className="text-sm font-bold text-atr-fg">
          Tidak ada yang menunggu verifikasi
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li
          key={it.progress_id}
          className="rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-atr-fg">
                  {it.criteria.title}
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    TIER_COLOR[it.criteria.tier] ?? "bg-atr-bg-soft text-atr-fg"
                  }`}
                >
                  {it.criteria.tier}
                </span>
                <span className="inline-flex rounded-full bg-atr-bg-soft px-2 py-0.5 text-[10px] font-bold text-atr-fg-muted">
                  {it.criteria.category}
                </span>
                {it.criteria.required && (
                  <span className="text-xs font-bold text-atr-red">wajib</span>
                )}
              </div>
              <p className="mt-1 text-xs text-atr-fg-muted">
                {it.desa.name} ·{" "}
                {it.submitted_at
                  ? new Intl.DateTimeFormat("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(it.submitted_at))
                  : "—"}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => decide(it.progress_id, "rejected")}
                disabled={pending}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-red/30 bg-white px-2 text-xs font-bold text-atr-red transition hover:bg-atr-red/10 disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                Reject
              </button>
              <button
                type="button"
                onClick={() => decide(it.progress_id, "verified")}
                disabled={pending}
                className="inline-flex h-8 items-center gap-1 rounded-md bg-atr-arti px-2 text-xs font-bold text-white transition hover:bg-atr-arti/90 disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                Verifikasi
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
