"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  ExternalLink,
  Tag,
  Loader2,
  X,
  Paperclip,
  Trash2,
} from "lucide-react";
import { toggleEvidenceTag } from "@/server/actions/evidence-tagging";
import { deleteEvidence } from "@/server/actions/evidence";
import type { EvidenceLibraryItem } from "@/server/queries/evidence";

function fileIcon(t: string) {
  if (t === "image") return ImageIcon;
  if (t === "video") return Video;
  if (t === "audio") return Music;
  return FileText;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "-";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${Math.round(kb)} KB`;
}

export function EvidenceLibraryView({
  projectDesaId,
  items,
}: {
  projectDesaId: string;
  items: EvidenceLibraryItem[];
}) {
  const [openTagger, setOpenTagger] = useState<string | null>(null);
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function remove(it: EvidenceLibraryItem) {
    const tagWarn =
      it.tag_count > 0
        ? `\n\nFile ini terkait ke ${it.tag_count} checklist; kaitan tersebut juga akan dilepas.`
        : "";
    if (
      !confirm(
        `Hapus "${it.original_filename ?? "bukti ini"}"? Tindakan ini tidak bisa dibatalkan.${tagWarn}`,
      )
    )
      return;
    setDeletingId(it.id);
    startTransition(async () => {
      const r = await deleteEvidence({
        evidence_id: it.id,
        project_desa_id: projectDesaId,
      });
      setDeletingId(null);
      if (r.error) alert(r.error);
      else router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
        <Paperclip className="mx-auto mb-3 h-6 w-6 text-atr-fg-muted" />
        <p className="text-sm font-bold text-atr-fg">Belum ada bukti pendukung</p>
        <p className="mt-1 text-xs text-atr-fg-muted">
          Buka topik → checklist → upload bukti pendukung. File akan muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const Icon = fileIcon(it.file_type);
          return (
            <article
              key={it.id}
              className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1"
            >
              {it.file_type === "image" && it.signed_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.signed_url}
                  alt={it.original_filename ?? ""}
                  className="h-32 w-full object-cover"
                />
              ) : (
                <div className="flex h-32 items-center justify-center bg-atr-purple-50">
                  <Icon className="h-10 w-10 text-atr-purple/60" />
                </div>
              )}
              <div className="space-y-2 p-3">
                <div className="text-xs font-bold text-atr-fg">
                  {it.original_filename ?? "-"}
                </div>
                {it.caption && (
                  <p className="line-clamp-2 text-[11px] text-atr-fg-muted">
                    {it.caption}
                  </p>
                )}
                <div className="flex items-center justify-between text-[10px] text-atr-fg-muted">
                  <span>
                    {it.uploaded_by_name} ·{" "}
                    {new Intl.DateTimeFormat("id-ID", {
                      day: "numeric",
                      month: "short",
                    }).format(new Date(it.uploaded_at))}
                  </span>
                  <span>{formatSize(it.file_size_bytes)}</span>
                </div>
                {it.tag_count > 0 && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-atr-purple-50 px-2 py-0.5 text-[10px] font-bold text-atr-purple-600">
                    <Tag className="h-2.5 w-2.5" />
                    Terkait ke {it.tag_count} checklist
                  </div>
                )}
                <div className="flex gap-1">
                  {it.signed_url && (
                    <a
                      href={it.signed_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-atr-outline bg-white px-2 text-[11px] font-bold text-atr-fg transition hover:bg-atr-bg-soft"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Buka
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpenTagger(it.id)}
                    className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md bg-atr-purple px-2 text-[11px] font-bold text-white transition hover:bg-atr-purple-600"
                  >
                    <Tag className="h-3 w-3" />
                    Tag
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(it)}
                    disabled={deletingId === it.id}
                    title="Hapus bukti pendukung"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-atr-outline bg-white text-atr-fg-muted transition hover:border-atr-red/30 hover:text-atr-red disabled:opacity-50"
                  >
                    {deletingId === it.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {openTagger && (
        <TagDialog
          evidenceId={openTagger}
          projectDesaId={projectDesaId}
          onClose={() => setOpenTagger(null)}
        />
      )}
    </>
  );
}

function TagDialog({
  evidenceId,
  projectDesaId,
  onClose,
}: {
  evidenceId: string;
  projectDesaId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [options, setOptions] = useState<
    Array<{
      checklist_progress_id: string | null;
      project_checklist_item_id: string;
      project_topik_id: string;
      title: string;
      topik_name: string;
      desa_topik_instance_id: string;
      tagged: boolean;
    }>
  >([]);
  const [pending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");

  // Lazy load options once on mount. (Doing this during render is a React
  // anti-pattern - it can wedge the transition and leave this fixed overlay
  // stuck on top of the page, swallowing clicks like the "Kembali" link.)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/evidence/${evidenceId}/options?projectDesaId=${projectDesaId}`,
      );
      const data = await res.json();
      if (cancelled) return;
      setOptions(data.options ?? []);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [evidenceId, projectDesaId]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(opt: (typeof options)[number]) {
    startTransition(async () => {
      const r = await toggleEvidenceTag({
        evidence_id: evidenceId,
        project_desa_id: projectDesaId,
        desa_topik_instance_id: opt.desa_topik_instance_id || null,
        project_topik_id: opt.project_topik_id,
        project_checklist_item_id: opt.project_checklist_item_id,
        want_tagged: !opt.tagged,
      });
      if (r.error) {
        alert(r.error);
        return;
      }
      setOptions((arr) =>
        arr.map((o) =>
          o.project_checklist_item_id === opt.project_checklist_item_id
            ? { ...o, tagged: !o.tagged }
            : o,
        ),
      );
      router.refresh();
    });
  }

  const grouped = new Map<string, typeof options>();
  for (const o of options) {
    if (search && !o.title.toLowerCase().includes(search.toLowerCase()))
      continue;
    const arr = grouped.get(o.topik_name) ?? [];
    arr.push(o);
    grouped.set(o.topik_name, arr);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-2 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-atr-4">
        <header className="flex items-center justify-between border-b border-atr-outline px-5 py-3">
          <div>
            <h3 className="text-sm font-bold text-atr-fg">
              Kaitkan ke checklist
            </h3>
            <p className="text-xs text-atr-fg-muted">
              Centang topik yang relevan. 1 file bisa di-tag ke banyak.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-atr-outline text-atr-fg-muted hover:bg-atr-bg-soft"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>
        <div className="border-b border-atr-outline p-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari item…"
            className="h-9 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        </div>
        <div className="max-h-[55vh] overflow-y-auto">
          {!loaded && (
            <div className="flex items-center justify-center gap-2 p-8 text-xs text-atr-fg-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat checklist…
            </div>
          )}
          {loaded &&
            Array.from(grouped.entries()).map(([topik, items]) => (
              <section key={topik}>
                <div className="sticky top-0 border-y border-atr-outline bg-atr-bg-soft px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-atr-purple-600">
                  {topik}
                </div>
                {items.map((opt) => (
                  <label
                    key={opt.project_checklist_item_id}
                    className="flex cursor-pointer items-center gap-3 border-b border-atr-outline px-4 py-2 hover:bg-atr-bg-soft"
                  >
                    <input
                      type="checkbox"
                      checked={opt.tagged}
                      onChange={() => toggle(opt)}
                      disabled={pending}
                      className="h-4 w-4 accent-atr-purple"
                    />
                    <span className="text-sm text-atr-fg">{opt.title}</span>
                  </label>
                ))}
              </section>
            ))}
        </div>
      </div>
    </div>
  );
}
