"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockOpen, Lock, Clock } from "lucide-react";
import { setTopikCheckinWindow } from "@/server/actions/topik-checkin";

type TopikWindow = {
  id: string;
  name: string;
  sort_order: number;
  checkin_open: boolean;
  checkin_closes_at: string | null;
};

function fmtTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function CheckinWindowControls({
  projectId,
  topik,
}: {
  projectId: string;
  topik: TopikWindow[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  // Nilai input datetime-local per modul (untuk auto-tutup opsional).
  const [closesAt, setClosesAt] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  // Status optimistis: langsung flip badge/tombol saat diklik, sebelum
  // router.refresh() (yang lebih lambat) membawa data terbaru.
  const [optimistic, setOptimistic] = useState<
    Record<string, { open: boolean; closes_at: string | null }>
  >({});

  // Bersihkan override optimistis begitu prop dari server sudah cocok.
  useEffect(() => {
    setOptimistic((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const t of topik) {
        const o = next[t.id];
        if (o && o.open === t.checkin_open) {
          delete next[t.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [topik]);

  function apply(topikId: string, open: boolean) {
    setError(null);
    setBusyId(topikId);
    setOptimistic((s) => ({
      ...s,
      [topikId]: { open, closes_at: open ? closesAt[topikId] || null : null },
    }));
    startTransition(async () => {
      try {
        const r = await setTopikCheckinWindow({
          project_id: projectId,
          project_topik_id: topikId,
          open,
          closes_at: open ? closesAt[topikId] || null : null,
        });
        if ("error" in r) {
          setError(r.error);
          // Batalkan optimistic bila gagal.
          setOptimistic((s) => {
            const next = { ...s };
            delete next[topikId];
            return next;
          });
        } else {
          router.refresh();
        }
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1">
      <h4 className="text-sm font-bold text-atr-fg">Kontrol check-in per modul</h4>
      <p className="mt-0.5 text-xs text-atr-fg-muted">
        Buka check-in saat sesi modul dimulai supaya tombolnya muncul di akun
        peserta. Tutup lagi (atau isi jam auto-tutup) agar tidak ada yang
        check-in di luar jam.
      </p>

      {error && (
        <div className="mt-3 rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
          {error}
        </div>
      )}

      <ul className="mt-3 space-y-2">
        {topik.map((t, i) => {
          const busy = busyId === t.id;
          const ov = optimistic[t.id];
          const isOpen = ov ? ov.open : t.checkin_open;
          const closesLabel = fmtTime(
            ov ? ov.closes_at : t.checkin_closes_at,
          );
          return (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-atr-outline bg-atr-bg-soft/40 p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-atr-fg">
                    {i + 1}. {t.name}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                      isOpen
                        ? "border-atr-arti/30 bg-atr-arti/15 text-atr-arti"
                        : "border-atr-outline bg-white text-atr-fg-muted"
                    }`}
                  >
                    {isOpen ? (
                      <LockOpen className="h-2.5 w-2.5" />
                    ) : (
                      <Lock className="h-2.5 w-2.5" />
                    )}
                    {isOpen ? "Buka" : "Tutup"}
                  </span>
                </div>
                {isOpen && closesLabel && (
                  <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-atr-fg-muted">
                    <Clock className="h-3 w-3" />
                    Auto-tutup: {closesLabel}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isOpen && (
                  <label className="flex items-center gap-1 text-[11px] text-atr-fg-muted">
                    Auto-tutup
                    <input
                      type="datetime-local"
                      value={closesAt[t.id] ?? ""}
                      onChange={(e) =>
                        setClosesAt((s) => ({ ...s, [t.id]: e.target.value }))
                      }
                      className="h-8 rounded-md border border-atr-outline bg-white px-2 text-xs outline-none focus:border-atr-purple"
                    />
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => apply(t.id, !isOpen)}
                  disabled={busy}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-white transition disabled:opacity-50 ${
                    isOpen
                      ? "bg-atr-red hover:bg-atr-red/90"
                      : "bg-atr-purple hover:bg-atr-purple-600"
                  }`}
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isOpen ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <LockOpen className="h-3.5 w-3.5" />
                  )}
                  {busy
                    ? "Menyimpan..."
                    : isOpen
                      ? "Tutup check-in"
                      : "Buka check-in"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
