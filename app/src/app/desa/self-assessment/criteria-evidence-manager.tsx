"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Upload,
  Link2,
  Loader2,
  Trash2,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Check,
  Search,
  Send,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import {
  uploadCriteriaEvidenceFile,
  linkPesertaEvidenceToCriteria,
  unlinkEvidenceFromCriteria,
  submitCriteriaItemForReview,
  listCriteriaEvidence,
  listPesertaEvidenceForDesa,
  signCriteriaEvidence,
  type CriteriaProgressEvidence,
  type PesertaEvidenceForDesa,
} from "@/server/actions/self-assessment";
import { compressIfImage } from "@/lib/image-compress";
import { CountBadge } from "@/components/ui/count-badge";

function fileIcon(type: string) {
  if (type === "image") return ImageIcon;
  if (type === "video") return Video;
  if (type === "audio") return Music;
  return FileText;
}

export function CriteriaEvidenceManager({
  open,
  onClose,
  desaId,
  criteriaItemId,
  criteriaTitle,
  progressId,
  initialNote,
}: {
  open: boolean;
  onClose: () => void;
  desaId: string;
  criteriaItemId: string;
  criteriaTitle: string;
  progressId: string | null;
  initialNote: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"upload" | "pick">("upload");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(initialNote ?? "");
  const [progress, setProgress] = useState<{ cur: number; total: number } | null>(
    null,
  );

  // existing linked evidence
  const [linked, setLinked] = useState<CriteriaProgressEvidence[]>([]);
  const [loadingLinked, setLoadingLinked] = useState(false);

  // peserta evidence picker
  const [pesertaEvs, setPesertaEvs] = useState<PesertaEvidenceForDesa[]>([]);
  const [loadingPeserta, setLoadingPeserta] = useState(false);
  const [pickerQ, setPickerQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Refresh linked list whenever the dialog opens or progress_id changes
  useEffect(() => {
    if (!open || !progressId) {
      setLinked([]);
      return;
    }
    setLoadingLinked(true);
    listCriteriaEvidence(progressId).then((rows) => {
      setLinked(rows);
      setLoadingLinked(false);
    });
  }, [open, progressId]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSelected(new Set());
      setPickerQ("");
      return;
    }
    setNote(initialNote ?? "");
  }, [open, initialNote]);

  // Lazy-load peserta evidence when picker tab opened
  useEffect(() => {
    if (!open || tab !== "pick" || pesertaEvs.length > 0) return;
    setLoadingPeserta(true);
    listPesertaEvidenceForDesa(desaId).then((rows) => {
      setPesertaEvs(rows);
      setLoadingPeserta(false);
    });
  }, [open, tab, desaId, pesertaEvs.length]);

  if (!open) return null;

  async function handleUpload(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setError(null);
    setProgress({ cur: 0, total: list.length });
    startTransition(async () => {
      const errors: string[] = [];
      for (let i = 0; i < list.length; i++) {
        setProgress({ cur: i + 1, total: list.length });
        const f = await compressIfImage(list[i]);
        if (f.size > 50 * 1024 * 1024) {
          errors.push(`${f.name}: > 50 MB`);
          continue;
        }
        const buf = await f.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let bin = "";
        for (let j = 0; j < bytes.length; j++) bin += String.fromCharCode(bytes[j]);
        const base64 = btoa(bin);
        const r = await uploadCriteriaEvidenceFile({
          desa_id: desaId,
          criteria_item_id: criteriaItemId,
          filename: f.name,
          mime_type: f.type || "application/octet-stream",
          base64,
          caption: null,
        });
        if ("error" in r) errors.push(`${f.name}: ${r.error}`);
      }
      setProgress(null);
      if (errors.length > 0)
        setError(`${errors.length} gagal: ${errors.slice(0, 3).join("; ")}`);
      // Reload linked list
      if (progressId) {
        const rows = await listCriteriaEvidence(progressId);
        setLinked(rows);
      }
      router.refresh();
    });
  }

  function toggleSelected(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function linkPicked() {
    if (selected.size === 0) return;
    setError(null);
    startTransition(async () => {
      const r = await linkPesertaEvidenceToCriteria({
        desa_id: desaId,
        criteria_item_id: criteriaItemId,
        evidence_ids: Array.from(selected),
      });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setSelected(new Set());
      if (progressId) {
        const rows = await listCriteriaEvidence(progressId);
        setLinked(rows);
      }
      router.refresh();
    });
  }

  function removeLinked(evidenceId: string) {
    if (!progressId) return;
    if (!confirm("Hapus bukti ini dari kriteria? (file aslinya tetap ada)")) return;
    setError(null);
    startTransition(async () => {
      const r = await unlinkEvidenceFromCriteria({
        desa_id: desaId,
        evidence_id: evidenceId,
        criteria_progress_id: progressId,
      });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      const rows = await listCriteriaEvidence(progressId);
      setLinked(rows);
      router.refresh();
    });
  }

  function submitForReview() {
    setError(null);
    startTransition(async () => {
      const r = await submitCriteriaItemForReview({
        desa_id: desaId,
        criteria_item_id: criteriaItemId,
        evidence_note: note.trim() || null,
      });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  async function openEvidence(fileUrl: string) {
    const signed = await signCriteriaEvidence(fileUrl);
    if (signed) window.open(signed, "_blank", "noopener");
  }

  // Filtered picker results
  const pickerFiltered = (() => {
    const q = pickerQ.trim().toLowerCase();
    const linkedIds = new Set(linked.map((l) => l.evidence_id));
    return pesertaEvs.filter((e) => {
      if (linkedIds.has(e.id)) return false;
      if (!q) return true;
      return (
        e.filename.toLowerCase().includes(q) ||
        (e.caption?.toLowerCase().includes(q) ?? false) ||
        e.project_name.toLowerCase().includes(q) ||
        (e.topik_name?.toLowerCase().includes(q) ?? false) ||
        (e.checklist_title?.toLowerCase().includes(q) ?? false) ||
        (e.uploaded_by_name?.toLowerCase().includes(q) ?? false)
      );
    });
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-atr-fg/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-2xl flex flex-col">
        <header className="flex items-start justify-between gap-2 border-b border-atr-outline p-5">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-atr-fg">
              Bukti Pendukung
            </h2>
            <p className="mt-0.5 line-clamp-1 text-xs text-atr-fg-muted">
              {criteriaTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-atr-fg-muted hover:bg-atr-bg-soft hover:text-atr-fg"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Existing linked evidence */}
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              Bukti tersaring untuk kriteria ini
              <CountBadge n={linked.length} />
            </h3>
            {loadingLinked ? (
              <div className="rounded-lg border border-dashed border-atr-outline bg-atr-bg-soft p-4 text-center text-xs text-atr-fg-muted">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              </div>
            ) : linked.length === 0 ? (
              <div className="rounded-lg border border-dashed border-atr-outline bg-atr-bg-soft p-4 text-center text-xs text-atr-fg-muted">
                Belum ada bukti. Upload baru di tab &quot;Upload&quot; atau pilih
                dari bukti peserta di tab &quot;Pilih dari Peserta&quot;.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {linked.map((ev) => {
                  const Icon = fileIcon(ev.file_type);
                  return (
                    <li
                      key={ev.evidence_id}
                      className="flex items-center gap-2 rounded-lg border border-atr-outline bg-white p-2.5"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                          ev.source === "linked"
                            ? "bg-atr-yellow/20 text-atr-fg"
                            : "bg-atr-purple-50 text-atr-purple-600"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-atr-fg">
                          {ev.filename}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-atr-fg-muted">
                          {ev.source === "linked" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-atr-yellow/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-atr-fg">
                              <Link2 className="h-2.5 w-2.5" />
                              dari project {ev.source_project_name ?? "-"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-atr-purple-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-atr-purple-600">
                              upload langsung
                            </span>
                          )}
                          {ev.caption && <span>· {ev.caption}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openEvidence(ev.file_url)}
                        className="rounded-md border border-atr-outline bg-white p-1.5 text-atr-fg-muted hover:bg-atr-bg-soft hover:text-atr-fg"
                        title="Buka file"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLinked(ev.evidence_id)}
                        className="rounded-md border border-atr-outline bg-white p-1.5 text-atr-fg-muted hover:border-atr-red/30 hover:text-atr-red"
                        title="Hapus dari kriteria"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Tabs */}
          <section>
            <nav className="flex gap-2 border-b border-atr-outline">
              <button
                type="button"
                onClick={() => setTab("upload")}
                className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition ${
                  tab === "upload"
                    ? "border-atr-purple text-atr-purple-600"
                    : "border-transparent text-atr-fg-muted hover:text-atr-fg"
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload Baru
              </button>
              <button
                type="button"
                onClick={() => setTab("pick")}
                className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition ${
                  tab === "pick"
                    ? "border-atr-purple text-atr-purple-600"
                    : "border-transparent text-atr-fg-muted hover:text-atr-fg"
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                Pilih dari Peserta
              </button>
            </nav>

            {tab === "upload" && (
              <div className="pt-3 space-y-3">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-atr-outline bg-white px-6 py-6 text-center transition hover:border-atr-purple/40 hover:bg-atr-purple-50/30">
                  {pending && progress ? (
                    <Loader2 className="h-6 w-6 animate-spin text-atr-purple" />
                  ) : (
                    <Upload className="h-6 w-6 text-atr-fg-muted" />
                  )}
                  <span className="text-sm font-bold text-atr-fg">
                    {pending && progress
                      ? `Upload ${progress.cur}/${progress.total}…`
                      : "Klik atau drag file ke sini"}
                  </span>
                  <span className="text-[11px] text-atr-fg-muted">
                    JPG / PNG / PDF / MP4 · multi-file · maks 50 MB / file · foto
                    auto-compress
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf,video/mp4,audio/mpeg,.doc,.docx"
                    multiple
                    disabled={pending}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) handleUpload(files);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {tab === "pick" && (
              <div className="pt-3 space-y-3">
                <div className="rounded-lg border border-atr-purple/20 bg-atr-purple-50/40 p-3 text-[11px] text-atr-fg">
                  💡 Pilih bukti yang sudah diupload peserta saat kegiatan
                  pendampingan. Bukti yang sama bisa dipakai untuk beberapa
                  kriteria. File asli tetap di project peserta - di sini
                  hanya di-link.
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-atr-fg-muted" />
                  <input
                    type="search"
                    value={pickerQ}
                    onChange={(e) => setPickerQ(e.target.value)}
                    placeholder="Cari nama file, caption, project, topik…"
                    className="h-9 w-full rounded-md border border-atr-outline bg-white pl-9 pr-3 text-xs outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                  />
                </div>

                {loadingPeserta ? (
                  <div className="rounded-lg border border-dashed border-atr-outline bg-atr-bg-soft p-6 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-atr-purple" />
                  </div>
                ) : pesertaEvs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-atr-outline bg-atr-bg-soft p-6 text-center text-xs text-atr-fg-muted">
                    Belum ada bukti yang diupload peserta di project-project
                    desa ini.
                  </div>
                ) : pickerFiltered.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-atr-outline bg-atr-bg-soft p-6 text-center text-xs text-atr-fg-muted">
                    Semua bukti peserta sudah di-link, atau tidak ada yang cocok.
                  </div>
                ) : (
                  <ul className="max-h-[40vh] divide-y divide-atr-outline overflow-y-auto rounded-lg border border-atr-outline">
                    {pickerFiltered.map((ev) => {
                      const Icon = fileIcon(ev.file_type);
                      const isSel = selected.has(ev.id);
                      return (
                        <li
                          key={ev.id}
                          className={`flex items-center gap-2 p-2.5 cursor-pointer transition ${
                            isSel ? "bg-atr-purple-50" : "hover:bg-atr-bg-soft"
                          }`}
                          onClick={() => toggleSelected(ev.id)}
                        >
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleSelected(ev.id)}
                            className="h-4 w-4 accent-atr-purple"
                          />
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-atr-yellow/20 text-atr-fg">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-bold text-atr-fg">
                              {ev.filename}
                            </div>
                            <div className="text-[10px] text-atr-fg-muted">
                              <span className="font-bold">
                                {ev.project_name}
                              </span>
                              {ev.checklist_title && (
                                <> · {ev.checklist_title}</>
                              )}
                              {ev.uploaded_by_name && (
                                <> · oleh {ev.uploaded_by_name}</>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {selected.size > 0 && (
                  <button
                    type="button"
                    onClick={linkPicked}
                    disabled={pending}
                    className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-atr-purple px-3 text-sm font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50"
                  >
                    {pending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Link2 className="h-3.5 w-3.5" />
                    )}
                    Link {selected.size} bukti ke kriteria
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Note */}
          <section className="space-y-2">
            <label className="block text-xs font-bold text-atr-fg">
              Catatan singkat (untuk reviewer)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Contoh: SK Pokdarwis ditandatangani Kades 12 Juni 2024."
              className="w-full rounded-md border border-atr-outline bg-white p-2 text-xs outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </section>

          {error && (
            <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
              {error}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-atr-outline bg-atr-bg-soft p-4">
          <p className="text-[11px] text-atr-fg-muted">
            {linked.length === 0
              ? "Tambahkan minimal 1 bukti sebelum submit untuk verifikasi."
              : `${linked.length} bukti siap diverifikasi.`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-lg border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={submitForReview}
              disabled={pending || linked.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-4 text-xs font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Submit untuk Verifikasi
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Quiet lint
void CheckCircle2;
