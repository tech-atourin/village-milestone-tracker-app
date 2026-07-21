"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, MapPin } from "lucide-react";
import { checkInTopik } from "@/server/actions/topik-checkin";
import { runOrQueue, isQueued } from "@/lib/offline/run";

export function TopikCheckinButton({
  projectId,
  topikId,
  checkedIn,
}: {
  projectId: string;
  topikId: string;
  checkedIn: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);

  if (checkedIn || queued) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-atr-arti/30 bg-atr-arti/15 px-2.5 py-1 text-[11px] font-bold text-atr-arti">
        <Check className="h-3 w-3" />
        {queued ? "Tersimpan (menunggu sinyal)" : "Sudah check-in"}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await runOrQueue(
              "checkin",
              { project_id: projectId, project_topik_id: topikId },
              () =>
                checkInTopik({
                  project_id: projectId,
                  project_topik_id: topikId,
                }),
            );
            if (isQueued(r)) setQueued(true);
            else if ("error" in r) setError(r.error);
            else router.refresh();
          })
        }
        disabled={pending}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <MapPin className="h-3.5 w-3.5" />
        )}
        Check-in
      </button>
      {error && <span className="text-[10px] text-atr-red">{error}</span>}
    </div>
  );
}
