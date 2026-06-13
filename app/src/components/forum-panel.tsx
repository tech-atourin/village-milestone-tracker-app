"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { postForumMessage } from "@/server/actions/forum";
import type { ForumPostRow } from "@/server/queries/forum";

export function ForumPanel({
  projectId,
  posts,
}: {
  projectId: string;
  posts: ForumPostRow[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 2) return;
    setError(null);
    startTransition(async () => {
      const r = await postForumMessage({ project_id: projectId, body: body.trim() });
      if (r.error) setError(r.error);
      else {
        setBody("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tulis pesan ke tim project…"
          rows={3}
          className="w-full rounded-lg border border-atr-outline p-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
        />
        {error && (
          <p className="text-xs text-atr-red">{error}</p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending || body.trim().length < 2}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Kirim
          </button>
        </div>
      </form>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-8 text-center">
          <MessageCircle className="mx-auto mb-2 h-6 w-6 text-atr-fg-muted" />
          <p className="text-sm text-atr-fg-muted">
            Belum ada diskusi. Jadi yang pertama!
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1"
            >
              <div className="flex items-center gap-2 text-xs text-atr-fg-muted">
                <span className="font-bold text-atr-fg">
                  {p.author.full_name}
                </span>
                <span>·</span>
                <span>
                  {new Intl.DateTimeFormat("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(p.created_at))}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-atr-fg">
                {p.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
