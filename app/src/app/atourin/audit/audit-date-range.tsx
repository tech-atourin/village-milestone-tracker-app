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
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-atr-purple" />
        <span className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
          Filter tanggal
        </span>
      </div>
      <label className="flex flex-col gap-1 text-xs">
        <span className="font-bold text-atr-fg">Dari</span>
        <input
          type="date"
          value={fromVal}
          onChange={(e) => setFromVal(e.target.value)}
          className="h-9 rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="font-bold text-atr-fg">Sampai</span>
        <input
          type="date"
          value={toVal}
          onChange={(e) => setToVal(e.target.value)}
          className="h-9 rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
        />
      </label>
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
