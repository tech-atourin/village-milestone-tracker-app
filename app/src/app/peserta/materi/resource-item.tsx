"use client";

import { useState, useTransition } from "react";
import {
  Link2,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File as FileIcon,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { signResourceDownload } from "@/server/actions/resources";
import type { ProjectResource } from "@/server/queries/resources";

function iconFor(r: ProjectResource) {
  if (r.kind === "link") return Link2;
  if (r.file_type === "image") return ImageIcon;
  if (r.file_type === "video") return Video;
  if (r.file_type === "audio") return Music;
  if (r.file_type === "document") return FileText;
  return FileIcon;
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PesertaResourceItem({ r }: { r: ProjectResource }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const Icon = iconFor(r);

  function open() {
    setErr(null);
    if (r.kind === "link" && r.url) {
      window.open(r.url, "_blank", "noopener,noreferrer");
      return;
    }
    startTransition(async () => {
      const res = await signResourceDownload(r.id);
      if ("error" in res) setErr(res.error);
      else window.open(res.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <li>
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="flex w-full items-center gap-3 rounded-xl border border-atr-outline bg-white p-3 text-left shadow-atr-1 transition hover:bg-atr-bg-soft disabled:opacity-60"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-atr-purple-50 text-atr-purple">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-atr-fg">{r.title}</span>
            {r.category && (
              <span className="rounded-full bg-atr-bg-soft px-2 py-0.5 text-[10px] font-bold text-atr-fg-muted">
                {r.category}
              </span>
            )}
          </div>
          {r.description && (
            <p className="mt-0.5 text-xs text-atr-fg-muted">{r.description}</p>
          )}
          {r.kind === "file" && (
            <p className="mt-0.5 text-[11px] text-atr-fg-muted">
              {fmtSize(r.file_size_bytes)}
            </p>
          )}
          {err && <p className="mt-1 text-[11px] text-atr-red">{err}</p>}
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-atr-fg-muted">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : r.kind === "link" ? (
            <ExternalLink className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </span>
      </button>
    </li>
  );
}
