"use client";

import { useEffect, useState } from "react";
import { WifiOff, Cloud, CheckCircle2 } from "lucide-react";
import { listQueue, flushQueue } from "@/lib/offline/queue";

type Status = "online" | "offline" | "syncing" | "synced";

export function OfflineIndicator() {
  const [status, setStatus] = useState<Status>("online");
  const [queued, setQueued] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      const q = await listQueue();
      if (!mounted) return;
      setQueued(q.length);
    }

    function updateOnline() {
      if (!mounted) return;
      setStatus(navigator.onLine ? "online" : "offline");
      if (navigator.onLine) refresh();
    }

    updateOnline();
    refresh();

    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    // Periodic queue refresh
    const interval = setInterval(refresh, 5000);

    return () => {
      mounted = false;
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      clearInterval(interval);
    };
  }, []);

  if (status === "online" && queued === 0) return null;

  if (status === "offline") {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-atr-yellow/40 bg-atr-yellow/90 px-4 py-2 text-xs font-bold text-atr-fg shadow-atr-2">
        <WifiOff className="mr-1.5 inline h-3 w-3" />
        Offline · {queued > 0 ? `${queued} item akan disinkronkan` : "perubahan disimpan lokal"}
      </div>
    );
  }

  if (queued > 0) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-atr-purple/30 bg-atr-purple-50 px-4 py-2 text-xs font-bold text-atr-purple-600 shadow-atr-2">
        <Cloud className="mr-1.5 inline h-3 w-3 animate-pulse" />
        Menyinkronkan {queued} perubahan…
        <button
          type="button"
          onClick={async () => {
            const r = await flushQueue();
            if (r.ok > 0) setStatus("synced");
          }}
          className="ml-2 underline hover:text-atr-purple-800"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (status === "synced") {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-atr-arti/40 bg-atr-arti/90 px-4 py-2 text-xs font-bold text-white shadow-atr-2">
        <CheckCircle2 className="mr-1.5 inline h-3 w-3" />
        Tersinkronisasi
      </div>
    );
  }

  return null;
}
