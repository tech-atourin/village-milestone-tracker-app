"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Circle,
  Loader2,
  Paperclip,
  ChevronRight,
} from "lucide-react";
import { submitChecklistItem } from "@/server/actions/checklist";
import type { ChecklistItemRow } from "@/server/queries/peserta";

const STATUS = {
  not_started: {
    icon: Circle,
    label: "Belum",
    style: "bg-atr-bg-soft text-atr-fg-muted border-atr-outline",
  },
  submitted: {
    icon: Clock,
    label: "Diserahkan",
    style: "bg-atr-yellow/20 text-atr-fg border-atr-yellow/40",
  },
  approved: {
    icon: CheckCircle2,
    label: "Disetujui",
    style: "bg-atr-arti/15 text-atr-arti border-atr-arti/30",
  },
  rejected: {
    icon: AlertCircle,
    label: "Revisi",
    style: "bg-atr-red/15 text-atr-red border-atr-red/30",
  },
} as const;

export function ChecklistItemList({
  projectDesaId,
  projectTopikId,
  items,
}: {
  projectDesaId: string;
  projectTopikId: string;
  items: ChecklistItemRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(item: ChecklistItemRow) {
    if (
      item.status === "approved" ||
      (item.status === "submitted" && item.evidence_count > 0)
    ) {
      // already in workflow
      return;
    }
    if (
      !confirm(
        "Tandai item ini sebagai diserahkan? Pastikan sudah upload evidence kalau perlu.",
      )
    )
      return;
    startTransition(async () => {
      const r = await submitChecklistItem({
        project_desa_id: projectDesaId,
        project_topik_id: projectTopikId,
        project_checklist_item_id: item.project_checklist_item_id,
      });
      if (r.error) alert(r.error);
      else router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm italic text-atr-fg-muted">
        Belum ada checklist item di topik ini.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const cfg = STATUS[item.status];
        const Icon = cfg.icon;
        const isPending = item.status === "submitted";
        const isApproved = item.status === "approved";
        const isRejected = item.status === "rejected";
        return (
          <li
            key={item.project_checklist_item_id}
            className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1"
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <Icon
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    isApproved
                      ? "text-atr-arti"
                      : isRejected
                        ? "text-atr-red"
                        : isPending
                          ? "text-atr-yellow"
                          : "text-atr-fg-muted"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-atr-fg">
                    {item.title}
                    {item.required && (
                      <span className="ml-1 text-xs font-bold text-atr-red">
                        *
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-1 text-xs text-atr-fg-muted">
                      {item.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.style}`}
                    >
                      {cfg.label}
                    </span>
                    {item.evidence_count > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-atr-purple-50 px-2 py-0.5 text-[10px] font-bold text-atr-purple-600">
                        <Paperclip className="h-2.5 w-2.5" />
                        {item.evidence_count} evidence
                      </span>
                    )}
                  </div>
                  {isRejected && item.review_note && (
                    <div className="mt-3 rounded-lg border border-atr-red/30 bg-atr-red/10 p-3 text-xs text-atr-red">
                      <span className="font-bold">Feedback Atourin: </span>
                      {item.review_note}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Link
                  href={`/peserta/projects/${projectDesaId}/topik/${projectTopikId}/item/${item.project_checklist_item_id}`}
                  className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
                >
                  Buka & upload evidence
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
                {!isApproved && !isPending && (
                  <button
                    type="button"
                    onClick={() => submit(item)}
                    disabled={pending}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-atr-purple px-3 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
                  >
                    {pending && <Loader2 className="h-3 w-3 animate-spin" />}
                    Tandai diserahkan
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
