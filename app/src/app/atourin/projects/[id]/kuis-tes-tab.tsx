"use client";

import { useState } from "react";
import { ClipboardList, FileSpreadsheet } from "lucide-react";

/**
 * Merges the native Kuis view and the external Google-Form "Hasil Tes" view
 * under one project tab, switched by a segmented chip. Both sub-views are
 * server-rendered and passed in as slots; only the active one is shown.
 */
export function KuisTesTab({
  kuis,
  gform,
}: {
  kuis: React.ReactNode;
  gform: React.ReactNode;
}) {
  const [active, setActive] = useState<"kuis" | "gform">("kuis");

  const chips = [
    { key: "kuis" as const, label: "Kuis", icon: ClipboardList },
    { key: "gform" as const, label: "Hasil Tes (Google Form)", icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => {
          const on = active === c.key;
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setActive(c.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                on
                  ? "border-atr-purple bg-atr-purple text-white"
                  : "border-atr-outline bg-white text-atr-fg hover:bg-atr-bg-soft"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Keep both mounted; toggle visibility so switching is instant and
          neither sub-view loses local state. */}
      <div className={active === "kuis" ? "" : "hidden"}>{kuis}</div>
      <div className={active === "gform" ? "" : "hidden"}>{gform}</div>
    </div>
  );
}
