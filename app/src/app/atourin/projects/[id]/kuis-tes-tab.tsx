"use client";

import { useState } from "react";
import { ClipboardList, FileSpreadsheet, UserPlus } from "lucide-react";

/**
 * Merges the native Kuis view, the pre-test registration list, and the
 * external Google-Form "Hasil Tes" view under one project tab, switched by a
 * segmented chip. Sub-views are server-rendered and passed in as slots; only
 * the active one is shown.
 */
export function KuisTesTab({
  kuis,
  pendaftaran,
  gform,
}: {
  kuis: React.ReactNode;
  pendaftaran: React.ReactNode;
  gform: React.ReactNode;
}) {
  const [active, setActive] = useState<"kuis" | "pendaftaran" | "gform">("kuis");

  const chips = [
    { key: "kuis" as const, label: "Kuis", icon: ClipboardList },
    { key: "pendaftaran" as const, label: "Pendaftaran", icon: UserPlus },
    { key: "gform" as const, label: "Survei Peserta", icon: FileSpreadsheet },
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
      <div className={active === "pendaftaran" ? "" : "hidden"}>
        {pendaftaran}
      </div>
      <div className={active === "gform" ? "" : "hidden"}>{gform}</div>
    </div>
  );
}
