"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Paperclip,
  ListChecks,
} from "lucide-react";
import type { CriteriaItemRow, Tier } from "@/server/queries/self-assessment";
import { CommentThread } from "@/components/assessment/comment-thread";
import type { AssessmentComment } from "@/server/queries/assessment-comments";
import { CriteriaEvidenceManager } from "./criteria-evidence-manager";

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

export function SelfAssessmentList({
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
  const [openItem, setOpenItem] = useState<CriteriaItemRow | null>(null);

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

      <div className="rounded-lg border border-atr-purple/30 bg-atr-purple-50/40 p-3 text-xs text-atr-fg">
        <strong className="inline-flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5 text-atr-purple" />
          Assessment Klasifikasi - beda dengan tugas pendampingan project.
        </strong>{" "}
        Checklist ini menentukan tier desa (Rintisan → Mandiri). Setiap
        kriteria wajib disertai bukti. <em>Tip:</em> kalau bukti sudah pernah
        di-upload peserta saat kegiatan project, klik
        &quot;Lampirkan&quot; → tab &quot;Pilih dari Peserta&quot; - gak perlu
        upload dua kali.
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
                          {(it.evidence_path || it.progress_id) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-atr-purple-50 px-2 py-0.5 text-atr-purple-600">
                              <Paperclip className="h-3 w-3" />
                              Bukti terlampir
                            </span>
                          )}
                        </div>

                        {it.evidence_note && it.status === "submitted" && (
                          <div className="mt-3 rounded-lg border border-atr-outline bg-atr-bg-soft p-3 text-xs">
                            <div className="font-bold text-atr-fg-muted">
                              Catatan tersimpan
                            </div>
                            <p className="mt-0.5 text-atr-fg">
                              {it.evidence_note}
                            </p>
                          </div>
                        )}
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setOpenItem(it)}
                          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-atr-outline bg-white px-2.5 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft"
                        >
                          <Paperclip className="h-3 w-3" />
                          {it.status === "rejected" ? "Submit ulang" : "Lampirkan bukti"}
                        </button>
                      )}
                      {(it.status === "submitted" ||
                        it.status === "verified") && (
                        <button
                          type="button"
                          onClick={() => setOpenItem(it)}
                          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-atr-outline bg-white px-2.5 text-xs font-bold text-atr-fg-muted hover:bg-atr-bg-soft"
                        >
                          <Paperclip className="h-3 w-3" />
                          Lihat bukti
                        </button>
                      )}
                    </div>
                    <CommentThread
                      targetType="criteria_item"
                      targetId={it.id}
                      desaId={desaId}
                      comments={commentsByItem.get(it.id) ?? []}
                      currentUserId={currentUserId}
                      currentUserRole={currentUserRole}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {openItem && (
        <CriteriaEvidenceManager
          open={true}
          onClose={() => setOpenItem(null)}
          desaId={desaId}
          criteriaItemId={openItem.id}
          criteriaTitle={openItem.title}
          progressId={openItem.progress_id}
          initialNote={openItem.evidence_note}
        />
      )}
    </div>
  );
}

// Quiet lint
void CheckCircle2;
