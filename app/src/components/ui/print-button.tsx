"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Cetak / Save PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
    >
      <Printer className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
