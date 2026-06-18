"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Send, MessageSquare, ShieldCheck, User as UserIcon } from "lucide-react";
import {
  addChecklistComment,
  listChecklistComments,
  type ChecklistComment,
} from "@/server/actions/checklist-comments";

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Admin Atourin",
  mitra_admin: "Mitra",
  narasumber: "Narasumber",
  peserta: "Peserta",
  desa_wisata: "Desa",
};

const REVIEWER_ROLES = new Set([
  "superadmin",
  "mitra_admin",
  "narasumber",
]);

function fmt(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ChecklistDiscussion({
  checklistProgressId,
  currentUserId,
}: {
  checklistProgressId: string;
  currentUserId: string;
}) {
  const [comments, setComments] = useState<ChecklistComment[] | null>(null);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listChecklistComments(checklistProgressId).then((c) => {
      if (alive) setComments(c);
    });
    return () => {
      alive = false;
    };
  }, [checklistProgressId]);

  function send() {
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      const r = await addChecklistComment({
        checklist_progress_id: checklistProgressId,
        body: body.trim(),
      });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setComments((prev) => [...(prev ?? []), r.comment]);
      setBody("");
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-atr-outline bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
        <MessageSquare className="h-3.5 w-3.5" />
        Diskusi
        {comments && comments.length > 0 && (
          <span className="rounded-full bg-atr-bg-soft px-1.5 text-[10px] text-atr-fg">
            {comments.length}
          </span>
        )}
      </div>

      {comments === null ? (
        <p className="text-xs text-atr-fg-muted">Memuat diskusi…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs italic text-atr-fg-muted">
          Belum ada catatan diskusi. Reviewer dan peserta bisa saling bertukar
          informasi di sini sebelum item ini di-approve atau di-reject.
        </p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => {
            const isMe = c.author_id === currentUserId;
            const isReviewer = REVIEWER_ROLES.has(c.author_role);
            return (
              <li
                key={c.id}
                className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    isReviewer
                      ? "bg-atr-purple-50 text-atr-purple-600"
                      : "bg-atr-bg-soft text-atr-fg-muted"
                  }`}
                >
                  {isReviewer ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    <UserIcon className="h-3.5 w-3.5" />
                  )}
                </div>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    isMe
                      ? "bg-atr-purple text-white"
                      : "bg-atr-bg-soft text-atr-fg"
                  }`}
                >
                  <div
                    className={`mb-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      isMe ? "text-white/80" : "text-atr-fg-muted"
                    }`}
                  >
                    {c.author_name} ·{" "}
                    {ROLE_LABEL[c.author_role] ?? c.author_role} · {fmt(c.created_at)}
                  </div>
                  <div className="whitespace-pre-wrap break-words">{c.body}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col gap-1.5 border-t border-atr-outline pt-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Tulis catatan atau pertanyaan untuk diskusi…"
          className="w-full rounded-lg border border-atr-outline bg-white p-2.5 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
        />
        {error && (
          <p className="text-xs text-atr-red">{error}</p>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={send}
            disabled={pending || !body.trim()}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-atr-purple px-3 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            Kirim catatan
          </button>
        </div>
      </div>
    </div>
  );
}
