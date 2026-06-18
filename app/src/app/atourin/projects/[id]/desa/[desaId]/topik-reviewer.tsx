"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  Circle,
  Paperclip,
  Loader2,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import type { TopikReviewGroup } from "@/server/queries/review";
import { reviewChecklistItem } from "@/server/actions/review";

const STATUS_PALETTE: Record<
  string,
  { label: string; bg: string; text: string; icon: typeof CheckCircle2 }
> = {
  not_started: {
    label: "Belum mulai",
    bg: "bg-atr-bg-soft",
    text: "text-atr-fg-muted",
    icon: Circle,
  },
  submitted: {
    label: "Menunggu review",
    bg: "bg-atr-yellow/20",
    text: "text-atr-fg",
    icon: Clock,
  },
  approved: {
    label: "Disetujui",
    bg: "bg-atr-arti/15",
    text: "text-atr-arti",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Ditolak",
    bg: "bg-atr-red/15",
    text: "text-atr-red",
    icon: XCircle,
  },
};

export function TopikReviewer({
  projectId,
  groups,
  canReview,
}: {
  projectId: string;
  groups: TopikReviewGroup[];
  canReview: boolean;
}) {
  const [openTopik, setOpenTopik] = useState<Set<string>>(() => {
    // Default-expand any topik with pending items.
    return new Set(
      groups
        .filter((g) => g.pending_count > 0)
        .map((g) => g.project_topik_id),
    );
  });

  function toggle(id: string) {
    setOpenTopik((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          Progress & Review Checklist per Topik
        </h2>
        <div className="text-[11px] text-atr-fg-muted">
          Klik topik untuk lihat item, bukti, dan{" "}
          {canReview ? "approve/reject" : "status review"}.
        </div>
      </div>
      <ul className="space-y-2">
        {groups.map((g) => {
          const isOpen = openTopik.has(g.project_topik_id);
          const isDone = g.completion_percent >= 100;
          const pct = Math.round(g.completion_percent);
          return (
            <li
              key={g.project_topik_id}
              className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1"
            >
              <button
                type="button"
                onClick={() => toggle(g.project_topik_id)}
                className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-atr-bg-soft"
                aria-expanded={isOpen}
              >
                {isOpen ? (
                  <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-atr-fg-muted" />
                ) : (
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-atr-fg-muted" />
                )}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-atr-purple-50 text-xs font-bold text-atr-purple">
                  {g.sort_order || "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-atr-fg">
                      {g.topik_name}
                    </h3>
                    {isDone && (
                      <span className="inline-flex items-center rounded-full bg-atr-arti/15 px-2 py-0.5 text-[10px] font-bold text-atr-arti">
                        Selesai
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-atr-fg-muted">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-atr-arti" />
                      {g.approved_count} disetujui
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock
                        className={`h-3 w-3 ${
                          g.pending_count > 0
                            ? "text-atr-yellow"
                            : "text-atr-fg-muted"
                        }`}
                      />
                      {g.pending_count} pending
                    </span>
                    <span>{g.total_count} total</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-atr-bg-soft">
                    <div
                      className="h-full bg-atr-purple transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm font-bold text-atr-fg">{pct}%</div>
              </button>

              {isOpen && (
                <div className="space-y-2 border-t border-atr-outline bg-atr-bg-soft/40 p-3">
                  {g.items.length === 0 ? (
                    <p className="py-6 text-center text-xs italic text-atr-fg-muted">
                      Tidak ada item checklist di topik ini.
                    </p>
                  ) : (
                    g.items.map((item) => (
                      <ItemRow
                        key={item.checklist_item_id}
                        item={item}
                        projectId={projectId}
                        canReview={canReview}
                      />
                    ))
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ItemRow({
  item,
  projectId,
  canReview,
}: {
  item: TopikReviewGroup["items"][number];
  projectId: string;
  canReview: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const palette = STATUS_PALETTE[item.status];
  const Icon = palette.icon;
  const isPending = item.status === "submitted";

  function review(decision: "approved" | "rejected") {
    if (!item.checklist_progress_id) return;
    if (decision === "rejected" && !note.trim()) {
      setError("Catatan wajib diisi sebelum tolak");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await reviewChecklistItem({
        checklist_progress_id: item.checklist_progress_id!,
        decision,
        note: note || null,
        project_id: projectId,
      });
      if (r.error) {
        setError(r.error);
      } else {
        setShowNote(false);
        setNote("");
        router.refresh();
      }
    });
  }

  return (
    <article className="rounded-xl border border-atr-outline bg-white p-3 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-atr-fg">{item.title}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${palette.bg} ${palette.text}`}
            >
              <Icon className="h-2.5 w-2.5" />
              {palette.label}
            </span>
          </div>
          {item.description && (
            <p className="mt-1 text-[11px] text-atr-fg-muted">
              {item.description}
            </p>
          )}
          {item.submitted_by && (
            <p className="mt-1 text-[10px] text-atr-fg-muted">
              Submit oleh{" "}
              <strong className="text-atr-fg">
                {item.submitted_by.full_name}
              </strong>
              {item.submitted_at && (
                <>
                  {" · "}
                  {new Intl.DateTimeFormat("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(item.submitted_at))}
                </>
              )}
            </p>
          )}
        </div>
      </header>

      {item.evidence_files.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
            <Paperclip className="h-2.5 w-2.5" />
            {item.evidence_files.length} bukti
          </div>
          <div className="flex flex-wrap gap-1.5">
            {item.evidence_files.map((f) => {
              const FileIcon =
                f.file_type === "image" ? ImageIcon : FileText;
              return (
                <a
                  key={f.id}
                  href={`/api/evidence/${f.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-[200px] items-center gap-1 truncate rounded-md border border-atr-outline bg-atr-bg-soft px-2 py-1 text-[11px] text-atr-fg transition hover:bg-white"
                  title={f.original_filename ?? f.file_url}
                >
                  <FileIcon className="h-3 w-3 shrink-0 text-atr-purple" />
                  <span className="truncate">
                    {f.original_filename ?? "(file)"}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {item.review_note && (
        <div className="mt-3 rounded-md border border-atr-outline bg-atr-bg-soft/50 p-2 text-[11px]">
          <strong className="text-atr-fg">Catatan review:</strong>{" "}
          <span className="text-atr-fg-muted">{item.review_note}</span>
        </div>
      )}

      {canReview && isPending && (
        <div className="mt-3 space-y-2 border-t border-atr-outline pt-3">
          {error && (
            <div className="rounded-md border border-atr-red/30 bg-atr-red/10 px-2 py-1.5 text-[11px] font-bold text-atr-red">
              {error}
            </div>
          )}
          {showNote && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Catatan (wajib untuk tolak, opsional untuk setujui)…"
              className="w-full rounded-md border border-atr-outline bg-white p-2 text-xs outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!showNote && (
              <button
                type="button"
                onClick={() => setShowNote(true)}
                className="text-[11px] font-bold text-atr-fg-muted hover:text-atr-fg"
              >
                + Tambah catatan
              </button>
            )}
            <button
              type="button"
              onClick={() => review("rejected")}
              disabled={pending}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-red/30 bg-white px-2.5 text-[11px] font-bold text-atr-red transition hover:bg-atr-red/5 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              Tolak
            </button>
            <button
              type="button"
              onClick={() => review("approved")}
              disabled={pending}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-atr-arti px-3 text-[11px] font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              Setujui
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
