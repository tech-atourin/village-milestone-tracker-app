"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Loader2,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  ExternalLink,
} from "lucide-react";
import { uploadEvidence } from "@/server/actions/evidence";
import { submitChecklistItem } from "@/server/actions/checklist";

type Evidence = {
  id: string;
  filename: string;
  file_type: string;
  caption: string | null;
  uploaded_at: string;
  signed_url: string | null;
};

const STATUS_BAR = {
  not_started: {
    label: "Belum dikerjakan",
    icon: Circle,
    style: "bg-atr-bg-soft text-atr-fg-muted",
  },
  submitted: {
    label: "Menunggu review Atourin",
    icon: Clock,
    style: "bg-atr-yellow/20 text-atr-fg",
  },
  approved: {
    label: "Sudah disetujui",
    icon: CheckCircle2,
    style: "bg-atr-arti/15 text-atr-arti",
  },
  rejected: {
    label: "Perlu revisi",
    icon: AlertCircle,
    style: "bg-atr-red/15 text-atr-red",
  },
} as const;

function fileIcon(type: string) {
  if (type === "image") return ImageIcon;
  if (type === "video") return Video;
  if (type === "audio") return Music;
  return FileText;
}

export function ItemDetailForm({
  projectDesaId,
  projectTopikId,
  checklistItemId,
  existingProgress,
  existingEvidence,
}: {
  projectDesaId: string;
  projectTopikId: string;
  checklistItemId: string;
  existingProgress: {
    id: string;
    status: "not_started" | "submitted" | "approved" | "rejected";
    review_note: string | null;
  } | null;
  existingEvidence: Evidence[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);

  const status = existingProgress?.status ?? "not_started";
  const statusCfg = STATUS_BAR[status];
  const StatusIcon = statusCfg.icon;

  async function handleFile(file: File) {
    if (file.size > 50 * 1024 * 1024) {
      setError("File terlalu besar (maks 50 MB)");
      return;
    }
    setError(null);

    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    startTransition(async () => {
      // Ensure progress row exists so we can tag
      let cpId = existingProgress?.id ?? null;
      if (!cpId) {
        const r = await submitChecklistItem({
          project_desa_id: projectDesaId,
          project_topik_id: projectTopikId,
          project_checklist_item_id: checklistItemId,
        });
        if (r.error) {
          setError(r.error);
          return;
        }
        cpId = r.checklist_progress_id ?? null;
      }

      const u = await uploadEvidence({
        project_desa_id: projectDesaId,
        checklist_progress_id: cpId,
        filename: file.name,
        mime_type: file.type || "application/octet-stream",
        base64,
        caption: caption.trim() || null,
      });
      if (u.error) {
        setError(u.error);
        return;
      }
      setCaption("");
      router.refresh();
    });
  }

  function submitForReview() {
    startTransition(async () => {
      const r = await submitChecklistItem({
        project_desa_id: projectDesaId,
        project_topik_id: projectTopikId,
        project_checklist_item_id: checklistItemId,
      });
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div
        className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${statusCfg.style}`}
      >
        <StatusIcon className="h-4 w-4" />
        {statusCfg.label}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          Evidence ({existingEvidence.length})
        </h2>
        {existingEvidence.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-atr-outline bg-white p-6 text-center text-sm text-atr-fg-muted">
            Belum ada evidence. Upload foto, dokumen, video, atau audio sebagai
            bukti.
          </p>
        ) : (
          <ul className="space-y-2">
            {existingEvidence.map((ev) => {
              const Icon = fileIcon(ev.file_type);
              return (
                <li
                  key={ev.id}
                  className="flex items-center gap-3 rounded-2xl border border-atr-outline bg-white p-3 shadow-atr-1"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-atr-purple-50 text-atr-purple">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-atr-fg">
                      {ev.filename}
                    </div>
                    {ev.caption && (
                      <div className="truncate text-xs text-atr-fg-muted">
                        {ev.caption}
                      </div>
                    )}
                    <div className="text-[11px] text-atr-fg-muted">
                      {new Intl.DateTimeFormat("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(ev.uploaded_at))}
                    </div>
                  </div>
                  {ev.signed_url && (
                    <a
                      href={ev.signed_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-atr-outline bg-white px-2 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Buka
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          Tambah evidence baru
        </h2>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-atr-fg">
            Caption (opsional)
          </span>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Contoh: SK Pokdarwis ditandatangani Kades 12 Juni"
            className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        </label>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-atr-outline bg-white px-6 py-8 text-center transition hover:border-atr-purple/40 hover:bg-atr-purple-50/40">
          {pending ? (
            <Loader2 className="h-8 w-8 animate-spin text-atr-purple" />
          ) : (
            <Upload className="h-8 w-8 text-atr-fg-muted" />
          )}
          <span className="text-sm font-bold text-atr-fg">
            {pending ? "Mengupload…" : "Klik atau drag file ke sini"}
          </span>
          <span className="text-xs text-atr-fg-muted">
            JPG / PNG / PDF / MP4 · maks 50 MB
          </span>
          <input
            type="file"
            accept="image/*,application/pdf,video/mp4,video/quicktime,audio/mpeg,.doc,.docx"
            disabled={pending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="hidden"
          />
        </label>

        {error && (
          <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 p-3 text-xs text-atr-red">
            {error}
          </div>
        )}
      </section>

      {status !== "approved" && status !== "submitted" && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={submitForReview}
            disabled={pending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-atr-purple px-5 text-sm font-bold text-white shadow-atr-1 transition hover:bg-atr-purple-600 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Serahkan untuk review
          </button>
        </div>
      )}
    </div>
  );
}
