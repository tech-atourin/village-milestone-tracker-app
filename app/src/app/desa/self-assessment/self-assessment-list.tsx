"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Loader2,
  Upload,
  Paperclip,
  X,
  FileText,
} from "lucide-react";
import { submitCriteriaItem } from "@/server/actions/self-assessment";
import type { CriteriaItemRow, Tier } from "@/server/queries/self-assessment";
import { CommentThread } from "@/components/assessment/comment-thread";
import type { AssessmentComment } from "@/server/queries/assessment-comments";

const TIER_LABEL: Record<Tier, string> = {
  rintisan: "Rintisan",
  berkembang: "Berkembang",
  maju: "Maju",
  mandiri: "Mandiri",
};

const TIER_COLOR: Record<Tier, string> = {
  rintisan: "bg-atr-yellow/15 text-atr-fg",
  berkembang: "bg-atr-arti/15 text-atr-arti",
  maju: "bg-atr-purple-50 text-atr-purple-600",
  mandiri: "bg-atr-purple-light/60 text-atr-purple-800",
};

const STATUS_STYLE = {
  not_started: { icon: Circle, color: "text-atr-fg-muted", label: "Belum" },
  submitted: { icon: Clock, color: "text-atr-yellow", label: "Menunggu verifikasi" },
  verified: { icon: CheckCircle2, color: "text-atr-arti", label: "Terverifikasi" },
  rejected: { icon: AlertCircle, color: "text-atr-red", label: "Perlu revisi" },
} as const;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      resolve(r.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function SelfAssessmentList({
  desaId,
  items,
  commentsByProgress,
  currentUserId,
  currentUserRole,
}: {
  desaId: string;
  items: CriteriaItemRow[];
  commentsByProgress: Map<string, AssessmentComment[]>;
  currentUserId: string;
  currentUserRole: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [errorByItem, setErrorByItem] = useState<Record<string, string | null>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const [activeTier, setActiveTier] = useState<Tier>(() => {
    const tiers: Tier[] = ["rintisan", "berkembang", "maju", "mandiri"];
    for (const t of tiers) {
      const tierItems = items.filter((i) => i.tier === t);
      const allRequiredDone = tierItems
        .filter((i) => i.required)
        .every((i) => i.status === "verified");
      if (!allRequiredDone) return t;
    }
    return "rintisan";
  });

  async function submit(item: CriteriaItemRow) {
    const file = files[item.id];
    const note = notes[item.id]?.trim() ?? "";
    if (!file) {
      setErrorByItem((e) => ({ ...e, [item.id]: "Wajib upload file evidence" }));
      return;
    }
    setErrorByItem((e) => ({ ...e, [item.id]: null }));
    const base64 = await fileToBase64(file);
    startTransition(async () => {
      const r = await submitCriteriaItem({
        desa_id: desaId,
        criteria_item_id: item.id,
        evidence_filename: file.name,
        evidence_mime: file.type || "application/octet-stream",
        evidence_base64: base64,
        evidence_note: note || null,
      });
      if (r.error) {
        setErrorByItem((e) => ({ ...e, [item.id]: r.error ?? "Gagal submit" }));
      } else {
        setFiles((f) => ({ ...f, [item.id]: null }));
        setNotes((n) => ({ ...n, [item.id]: "" }));
        setOpenItemId(null);
        router.refresh();
      }
    });
  }

  const tierStats: Record<
    Tier,
    { total: number; verified: number; submitted: number }
  > = {
    rintisan: { total: 0, verified: 0, submitted: 0 },
    berkembang: { total: 0, verified: 0, submitted: 0 },
    maju: { total: 0, verified: 0, submitted: 0 },
    mandiri: { total: 0, verified: 0, submitted: 0 },
  };
  for (const item of items) {
    tierStats[item.tier].total++;
    if (item.status === "verified") tierStats[item.tier].verified++;
    if (item.status === "submitted") tierStats[item.tier].submitted++;
  }

  const activeItems = items.filter((i) => i.tier === activeTier);
  const grouped = new Map<string, CriteriaItemRow[]>();
  for (const it of activeItems) {
    const arr = grouped.get(it.category) ?? [];
    arr.push(it);
    grouped.set(it.category, arr);
  }

  return (
    <div className="space-y-5">
      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["rintisan", "berkembang", "maju", "mandiri"] as Tier[]).map((tier) => {
          const stats = tierStats[tier];
          const isActive = activeTier === tier;
          const pct = stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0;
          return (
            <button
              key={tier}
              type="button"
              onClick={() => setActiveTier(tier)}
              className={`rounded-2xl border-2 p-3 text-left transition ${
                isActive
                  ? "border-atr-purple bg-atr-purple-50"
                  : "border-atr-outline bg-white hover:bg-atr-bg-soft"
              }`}
            >
              <div
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${TIER_COLOR[tier]}`}
              >
                {TIER_LABEL[tier]}
              </div>
              <div className="mt-2 text-2xl font-bold text-atr-fg">{pct}%</div>
              <div className="text-[11px] text-atr-fg-muted">
                {stats.verified} / {stats.total} terverifikasi
              </div>
            </button>
          );
        })}
      </nav>

      <div className="rounded-lg border border-atr-yellow/40 bg-atr-yellow/10 p-3 text-xs text-atr-fg">
        <strong>Catatan:</strong> Setiap kriteria yang diklaim WAJIB disertai
        bukti (foto/dokumen) + catatan singkat. Tanpa evidence, kriteria
        tidak bisa disubmit untuk verifikasi.
      </div>

      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([category, catItems]) => (
          <section
            key={category}
            className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1"
          >
            <header className="border-b border-atr-outline bg-atr-bg-soft px-5 py-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-atr-purple">
                {category}
              </h3>
            </header>
            <ul className="divide-y divide-atr-outline">
              {catItems.map((it) => {
                const cfg = STATUS_STYLE[it.status];
                const Icon = cfg.icon;
                const canEdit =
                  it.status === "not_started" || it.status === "rejected";
                const isOpen = openItemId === it.id;
                const file = files[it.id];
                const note = notes[it.id] ?? "";
                const err = errorByItem[it.id];

                return (
                  <li key={it.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <Icon
                        className={`mt-0.5 h-5 w-5 shrink-0 ${cfg.color}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-atr-fg">
                          {it.title}
                          {it.required && (
                            <span className="ml-1 text-xs text-atr-red">*</span>
                          )}
                        </div>
                        {it.description && (
                          <p className="mt-1 text-xs text-atr-fg-muted">
                            {it.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`inline-flex rounded-full bg-atr-bg-soft px-2 py-0.5 font-bold ${cfg.color}`}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-atr-fg-muted">
                            Bobot: {it.weight}
                          </span>
                          {it.evidence_path && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-atr-purple-50 px-2 py-0.5 text-atr-purple-600">
                              <Paperclip className="h-3 w-3" />
                              Evidence terlampir
                            </span>
                          )}
                        </div>

                        {/* Evidence panel — visible when open or status==submitted/verified */}
                        {(isOpen ||
                          (it.status === "submitted" && it.evidence_note)) && (
                          <div className="mt-3 rounded-lg border border-atr-outline bg-atr-bg-soft p-3 space-y-3">
                            {it.evidence_note && !isOpen && (
                              <div className="text-xs">
                                <div className="font-bold text-atr-fg-muted">
                                  Catatan tersimpan
                                </div>
                                <p className="mt-0.5 text-atr-fg">
                                  {it.evidence_note}
                                </p>
                              </div>
                            )}

                            {isOpen && canEdit && (
                              <>
                                <div>
                                  <label className="block text-xs font-bold text-atr-fg">
                                    Upload bukti (foto/dokumen) <span className="text-atr-red">*</span>
                                  </label>
                                  <input
                                    ref={(el) => {
                                      fileInputs.current[it.id] = el;
                                    }}
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={(e) =>
                                      setFiles((f) => ({
                                        ...f,
                                        [it.id]: e.target.files?.[0] ?? null,
                                      }))
                                    }
                                    className="mt-1 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-atr-purple file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-atr-purple-600"
                                  />
                                  {file && (
                                    <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-atr-purple-50 px-2 py-1 text-[11px] text-atr-purple-600">
                                      <FileText className="h-3 w-3" />
                                      {file.name}{" "}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setFiles((f) => ({
                                            ...f,
                                            [it.id]: null,
                                          }));
                                          if (fileInputs.current[it.id])
                                            fileInputs.current[it.id]!.value = "";
                                        }}
                                        className="ml-0.5 text-atr-fg-muted hover:text-atr-red"
                                        aria-label="Hapus file"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-atr-fg">
                                    Catatan singkat
                                  </label>
                                  <textarea
                                    value={note}
                                    onChange={(e) =>
                                      setNotes((n) => ({
                                        ...n,
                                        [it.id]: e.target.value,
                                      }))
                                    }
                                    rows={2}
                                    placeholder="Jelaskan singkat bagaimana kriteria ini dipenuhi…"
                                    className="mt-1 w-full rounded-md border border-atr-outline bg-white p-2 text-xs outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                                  />
                                </div>

                                {err && (
                                  <div className="text-xs font-bold text-atr-red">
                                    {err}
                                  </div>
                                )}

                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setOpenItemId(null)}
                                    className="inline-flex h-8 items-center rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-white"
                                  >
                                    Batal
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => submit(it)}
                                    disabled={pending || !file}
                                    className="inline-flex h-8 items-center gap-1 rounded-md bg-atr-purple px-3 text-xs font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50"
                                  >
                                    {pending ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Upload className="h-3 w-3" />
                                    )}
                                    Submit untuk verifikasi
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {canEdit && !isOpen && (
                        <button
                          type="button"
                          onClick={() => setOpenItemId(it.id)}
                          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-atr-outline bg-white px-2.5 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft"
                        >
                          <Upload className="h-3 w-3" />
                          {it.status === "rejected" ? "Submit ulang" : "Lampirkan bukti"}
                        </button>
                      )}
                    </div>
                    {it.progress_id && (
                      <CommentThread
                        targetType="criteria_progress"
                        targetId={it.progress_id}
                        desaId={desaId}
                        comments={commentsByProgress.get(it.progress_id) ?? []}
                        currentUserId={currentUserId}
                        currentUserRole={currentUserRole}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
