"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Calendar, X } from "lucide-react";

export function AuditDateRange({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [fromVal, setFromVal] = useState(from ?? "");
  const [toVal, setToVal] = useState(to ?? "");

  function apply() {
    const next = new URLSearchParams(params);
    if (fromVal) next.set("from", fromVal);
    else next.delete("from");
    if (toVal) next.set("to", toVal);
    else next.delete("to");
    router.push(`/atourin/audit?${next.toString()}`);
  }

  function clear() {
    setFromVal("");
    setToVal("");
    router.push("/atourin/audit");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex h-9 items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
        <Calendar className="h-4 w-4 text-atr-purple" />
        Filter tanggal
      </div>
      <input
        type="date"
        value={fromVal}
        onChange={(e) => setFromVal(e.target.value)}
        aria-label="Dari"
        className="h-9 rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
      />
      <span className="text-xs text-atr-fg-muted">s.d.</span>
      <input
        type="date"
        value={toVal}
        onChange={(e) => setToVal(e.target.value)}
        aria-label="Sampai"
        className="h-9 rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
      />
      <button
        type="button"
        onClick={apply}
        className="inline-flex h-9 items-center rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600"
      >
        Terapkan
      </button>
      {(fromVal || toVal) && (
        <button
          type="button"
          onClick={clear}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg-muted transition hover:bg-atr-bg-soft"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}
    </div>
  );
}
