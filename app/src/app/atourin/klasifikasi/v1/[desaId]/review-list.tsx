"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  Image as ImageIcon,
} from "lucide-react";
import type { CriteriaItemRow } from "@/server/queries/self-assessment";
import type { AssessmentComment } from "@/server/queries/assessment-comments";
import { verifyCriteriaItem, signCriteriaEvidence } from "@/server/actions/self-assessment";
import { CommentThread } from "@/components/assessment/comment-thread";

const TIER_COLOR: Record<string, string> = {
  rintisan: "bg-atr-yellow/20 text-atr-fg border-atr-yellow/40",
  berkembang: "bg-atr-arti/15 text-atr-arti border-atr-arti/30",
  maju: "bg-atr-purple-50 text-atr-purple-600 border-atr-purple/30",
  mandiri: "bg-atr-purple-light/60 text-atr-purple-800 border-atr-purple/50",
};

const STATUS_BADGE: Record<string, string> = {
  not_started: "bg-atr-bg-soft text-atr-fg-muted",
  submitted: "bg-atr-yellow/20 text-atr-fg",
  verified: "bg-atr-arti/15 text-atr-arti",
  rejected: "bg-atr-red/15 text-atr-red",
};
const STATUS_LABEL: Record<string, string> = {
  not_started: "Belum dikerjakan",
  submitted: "Menunggu review",
  verified: "Terverifikasi",
  rejected: "Ditolak",
};

type StatusFilter = "all" | "submitted" | "verified" | "rejected" | "not_started";

export function V1ReviewList({
  desaId,
  items,
  commentsByItem,
  currentUserId,
  currentUserRole,
}: {
  desaId: string;
  items: CriteriaItemRow[];
  commentsByItem: Map<string, AssessmentComment[]>;
  currentUserId: string;
  currentUserRole: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("submitted");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () =>
      items.filter((it) => {
        if (tierFilter !== "all" && it.tier !== tierFilter) return false;
        if (statusFilter !== "all" && it.status !== statusFilter) return false;
        return true;
      }),
    [items, tierFilter, statusFilter],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, CriteriaItemRow[]>();
    for (const it of filtered) {
      const key = `${it.tier}::${it.category}`;
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const counts = useMemo(() => {
    const c = { all: items.length, submitted: 0, verified: 0, rejected: 0, not_started: 0 };
    for (const it of items) c[it.status] = (c[it.status] ?? 0) + 1;
    return c;
  }, [items]);

  function decide(progressId: string, decision: "verified" | "rejected") {
    setBusyId(progressId);
    startTransition(async () => {
      const r = await verifyCriteriaItem({ progress_id: progressId, decision });
      if (r.error) alert(r.error);
      else router.refresh();
      setBusyId(null);
    });
  }

  async function loadEvidence(progressId: string, path: string) {
    if (signedUrls[progressId]) {
      window.open(signedUrls[progressId], "_blank", "noopener");
      return;
    }
    const url = await signCriteriaEvidence(path);
    if (url) {
      setSignedUrls((m) => ({ ...m, [progressId]: url }));
      window.open(url, "_blank", "noopener");
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-atr-outline bg-white p-3 shadow-atr-1">
        <Filter className="h-3.5 w-3.5 text-atr-fg-muted" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-9 rounded-md border border-atr-outline bg-white px-2 text-xs outline-none focus:border-atr-purple"
        >
          <option value="submitted">Menunggu review · {counts.submitted}</option>
          <option value="verified">Terverifikasi · {counts.verified}</option>
          <option value="rejected">Ditolak · {counts.rejected}</option>
          <option value="not_started">Belum dikerjakan · {counts.not_started}</option>
          <option value="all">Semua · {counts.all}</option>
        </select>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="h-9 rounded-md border border-atr-outline bg-white px-2 text-xs outline-none focus:border-atr-purple"
        >
          <option value="all">Semua Tier</option>
          <option value="rintisan">Rintisan</option>
          <option value="berkembang">Berkembang</option>
          <option value="maju">Maju</option>
          <option value="mandiri">Mandiri</option>
        </select>
        <span className="ml-auto text-xs text-atr-fg-muted">
          Menampilkan <strong className="text-atr-fg">{filtered.length}</strong>{" "}
          kriteria
        </span>
      </div>

      {grouped.length === 0 && (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-atr-bg-soft p-12 text-center">
          <p className="text-sm text-atr-fg-muted">
            Tidak ada kriteria yang cocok dengan filter.
          </p>
        </div>
      )}

      {grouped.map(([key, list]) => {
        const [tier, category] = key.split("::");
        return (
          <section key={key} className="space-y-2">
            <header className="flex items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                  TIER_COLOR[tier] ?? ""
                }`}
              >
                {tier}
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                {category}
              </h3>
              <span className="text-[11px] text-atr-fg-muted">
                {list.length} item
              </span>
            </header>
            <ul className="space-y-2">
              {list.map((it) => (
                <li
                  key={it.id}
                  className="rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-atr-fg">
                          {it.title}
                        </p>
                        {it.required && (
                          <span className="text-[10px] font-bold uppercase text-atr-red">
                            wajib
                          </span>
                        )}
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            STATUS_BADGE[it.status] ?? ""
                          }`}
                        >
                          {STATUS_LABEL[it.status]}
                        </span>
                        <span className="text-[10px] text-atr-fg-muted">
                          bobot {it.weight}
                        </span>
                      </div>
                      {it.description && (
                        <p className="text-xs text-atr-fg-muted">
                          {it.description}
                        </p>
                      )}
                      {it.evidence_note && (
                        <div className="rounded-lg border border-atr-outline bg-atr-bg-soft p-2">
                          <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
                            Catatan desa
                          </div>
                          <p className="mt-0.5 whitespace-pre-line text-xs text-atr-fg">
                            {it.evidence_note}
                          </p>
                        </div>
                      )}
                      {it.evidence_path && (
                        <button
                          type="button"
                          onClick={() =>
                            it.progress_id &&
                            loadEvidence(it.progress_id, it.evidence_path!)
                          }
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-atr-outline bg-white px-2 text-[11px] font-bold text-atr-fg hover:bg-atr-bg-soft"
                        >
                          <ImageIcon className="h-3 w-3" />
                          Buka evidence
                        </button>
                      )}
                    </div>
                    {it.status === "submitted" && it.progress_id && (
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            decide(it.progress_id!, "rejected")
                          }
                          disabled={pending}
                          className="inline-flex h-9 items-center gap-1 rounded-md border border-atr-red/30 bg-white px-3 text-xs font-bold text-atr-red transition hover:bg-atr-red/10 disabled:opacity-50"
                        >
                          {busyId === it.progress_id && pending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          Tolak
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            decide(it.progress_id!, "verified")
                          }
                          disabled={pending}
                          className="inline-flex h-9 items-center gap-1 rounded-md bg-atr-arti px-3 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                        >
                          {busyId === it.progress_id && pending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Verifikasi
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <CommentThread
                      targetType="criteria_item"
                      targetId={it.id}
                      desaId={desaId}
                      comments={commentsByItem.get(it.id) ?? []}
                      currentUserId={currentUserId}
                      currentUserRole={currentUserRole}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

