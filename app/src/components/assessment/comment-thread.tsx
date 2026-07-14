"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Send,
  Loader2,
  Trash2,
  ShieldCheck,
  User as UserIcon,
  Lock,
} from "lucide-react";
import type { AssessmentComment } from "@/server/queries/assessment-comments";
import {
  addAssessmentComment,
  deleteAssessmentComment,
} from "@/server/actions/assessment-comments";
import { CountBadge } from "@/components/ui/count-badge";

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Admin Atourin",
  mitra_admin: "Mitra",
  peserta: "Peserta",
  narasumber: "Narasumber",
  desa_wisata: "Pengelola Desa",
};

function fmtRelative(iso: string) {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = (now - t) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function CommentThread({
  targetType,
  targetId,
  desaId,
  comments,
  currentUserId,
  currentUserRole,
}: {
  targetType: "criteria_progress" | "criteria_item" | "hub_question";
  targetId: string;
  desaId: string;
  comments: AssessmentComment[];
  currentUserId: string;
  currentUserRole: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [open, setOpen] = useState(comments.length > 0);
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canInternal = currentUserRole === "superadmin";

  function send() {
    if (!body.trim()) return;
    setErr(null);
    startTransition(async () => {
      const r = await addAssessmentComment({
        target_type: targetType,
        target_id: targetId,
        desa_id: desaId,
        body: body.trim(),
        is_internal: isInternal,
      });
      if (r.error) setErr(r.error);
      else {
        setBody("");
        setIsInternal(false);
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Hapus comment ini?")) return;
    setDeletingId(id);
    startTransition(async () => {
      try {
        const r = await deleteAssessmentComment(id);
        if (r.error) setErr(r.error);
        else router.refresh();
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div className="mt-3 rounded-lg border border-atr-outline bg-atr-bg-soft/50">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-atr-fg-muted hover:text-atr-fg"
      >
        <span className="inline-flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          Diskusi
          <CountBadge n={comments.length} />
        </span>
        <span className="text-[10px] text-atr-purple-600">
          {open ? "Tutup" : "Buka"}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-atr-outline p-3">
          {comments.length === 0 ? (
            <p className="text-[11px] italic text-atr-fg-muted">
              Belum ada diskusi. Mulai dengan post pertama di bawah.
            </p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => {
                const isAdmin = c.author_role === "superadmin";
                return (
                  <li
                    key={c.id}
                    className={`flex gap-2 rounded-md p-2 text-xs ${
                      isAdmin
                        ? "border border-atr-purple/20 bg-atr-purple-50/50"
                        : "bg-white"
                    } ${c.is_internal ? "border-2 border-dashed border-atr-yellow/40" : ""}`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        isAdmin
                          ? "bg-atr-purple text-white"
                          : "bg-atr-yellow/30 text-atr-fg"
                      }`}
                    >
                      {isAdmin ? (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      ) : (
                        <UserIcon className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-atr-fg">
                          {c.author_name}
                        </span>
                        <span className="rounded-full bg-atr-bg-soft px-1.5 py-0.5 text-[9px] font-bold uppercase text-atr-fg-muted">
                          {ROLE_LABEL[c.author_role] ?? c.author_role}
                        </span>
                        {c.is_internal && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-atr-yellow/30 px-1.5 py-0.5 text-[9px] font-bold text-atr-fg">
                            <Lock className="h-2 w-2" />
                            Internal
                          </span>
                        )}
                        <span className="text-[10px] text-atr-fg-muted">
                          · {fmtRelative(c.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-line text-atr-fg">
                        {c.body}
                      </p>
                    </div>
                    {(c.author_id === currentUserId ||
                      currentUserRole === "superadmin") && (
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        disabled={deletingId === c.id}
                        className="shrink-0 rounded-md p-1 text-atr-fg-muted hover:bg-atr-red/10 hover:text-atr-red disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Hapus"
                      >
                        {deletingId === c.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Compose */}
          <div className="space-y-2 rounded-md border border-atr-outline bg-white p-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              placeholder={
                currentUserRole === "superadmin"
                  ? "Tulis feedback untuk desa (atau internal note)..."
                  : "Tanya/balas admin Atourin..."
              }
              className="w-full resize-none rounded-md border border-atr-outline bg-white p-2 text-xs outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
            {err && (
              <div className="text-[11px] font-bold text-atr-red">{err}</div>
            )}
            <div className="flex items-center justify-between">
              {canInternal ? (
                <label className="inline-flex items-center gap-1.5 text-[11px] text-atr-fg-muted">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="h-3 w-3 accent-atr-yellow"
                  />
                  Internal (hanya admin lain yang lihat)
                </label>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={send}
                disabled={pending || !body.trim()}
                className="inline-flex h-7 items-center gap-1 rounded-md bg-atr-purple px-2 text-[11px] font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
