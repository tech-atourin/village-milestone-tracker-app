"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  Image as ImageIcon,
  Link2,
  Paperclip,
  ExternalLink,
} from "lucide-react";
import type { CriteriaItemRow } from "@/server/queries/self-assessment";
import type { AssessmentComment } from "@/server/queries/assessment-comments";
import {
  verifyCriteriaItem,
  signCriteriaEvidence,
  listCriteriaEvidence,
  type CriteriaProgressEvidence,
} from "@/server/actions/self-assessment";
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
  // Track BOTH the item and which decision is in-flight, so only the
  // clicked button (Tolak vs Verifikasi) shows a spinner.
  const [busy, setBusy] = useState<{
    id: string;
    decision: "verified" | "rejected";
  } | null>(null);
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
    setBusy({ id: progressId, decision });
    startTransition(async () => {
      const r = await verifyCriteriaItem({ progress_id: progressId, decision });
      if (r.error) alert(r.error);
      else router.refresh();
      setBusy(null);
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
          aria-label="Filter kriteria berdasarkan tingkat Permenpar"
          title="Kriteria Permenpar bertingkat: untuk naik ke Maju, desa harus penuhi kriteria Rintisan + Berkembang + Maju. Filter ini menyaring item per tingkat."
          className="h-9 rounded-md border border-atr-outline bg-white px-2 text-xs outline-none focus:border-atr-purple"
        >
          <option value="all">Semua Tingkat Kriteria</option>
          <option value="rintisan">Kriteria Rintisan</option>
          <option value="berkembang">Kriteria Berkembang</option>
          <option value="maju">Kriteria Maju</option>
          <option value="mandiri">Kriteria Mandiri</option>
        </select>
        <span className="ml-auto text-xs text-atr-fg-muted">
          Menampilkan <strong className="text-atr-fg">{filtered.length}</strong>{" "}
          kriteria
        </span>
      </div>
      <p className="-mt-2 px-1 text-[11px] text-atr-fg-muted">
        💡 Kriteria Permenpar bertingkat. Desa naik klasifikasi (Rintisan →
        Mandiri) dengan memenuhi kriteria wajib di tiap tingkat secara
        bertahap. Filter di atas menyaring <em>item kriteria</em> per
        tingkat, bukan tier desa.
      </p>

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
                      {/* Legacy single-file evidence (demo / old submissions) */}
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
                          Buka evidence (lama)
                        </button>
                      )}
                      {/* Multi-file + cross-linked evidence */}
                      {it.progress_id && (
                        <CriteriaEvidenceList progressId={it.progress_id} />
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
                          {busy?.id === it.progress_id &&
                          busy?.decision === "rejected" ? (
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
                          {busy?.id === it.progress_id &&
                          busy?.decision === "verified" ? (
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

// Lazy-loads evidence tagged to a criteria progress row — both files
// uploaded directly by the desa and files cross-linked from peserta
// project evidence. Auto-loads on mount.
function CriteriaEvidenceList({ progressId }: { progressId: string }) {
  const [items, setItems] = useState<CriteriaProgressEvidence[] | null>(null);
  const [signing, setSigning] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listCriteriaEvidence(progressId).then((rows) => {
      if (alive) setItems(rows);
    });
    return () => {
      alive = false;
    };
  }, [progressId]);

  async function open(fileUrl: string) {
    setSigning(fileUrl);
    const url = await signCriteriaEvidence(fileUrl);
    setSigning(null);
    if (url) window.open(url, "_blank", "noopener");
  }

  if (items === null)
    return (
      <div className="inline-flex items-center gap-1 text-[11px] text-atr-fg-muted">
        <Loader2 className="h-3 w-3 animate-spin" />
        Memuat bukti…
      </div>
    );
  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        Bukti pendukung ({items.length})
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((ev) => (
          <li key={ev.evidence_id}>
            <button
              type="button"
              onClick={() => open(ev.file_url)}
              disabled={signing === ev.file_url}
              className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-bold transition ${
                ev.source === "linked"
                  ? "border-atr-yellow/40 bg-atr-yellow/10 text-atr-fg hover:bg-atr-yellow/20"
                  : "border-atr-outline bg-white text-atr-fg hover:bg-atr-bg-soft"
              }`}
              title={
                ev.source === "linked"
                  ? `Dari project ${ev.source_project_name ?? "—"}`
                  : "Upload langsung oleh desa"
              }
            >
              {signing === ev.file_url ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : ev.source === "linked" ? (
                <Link2 className="h-3 w-3" />
              ) : (
                <Paperclip className="h-3 w-3" />
              )}
              <span className="max-w-[160px] truncate">{ev.filename}</span>
              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

