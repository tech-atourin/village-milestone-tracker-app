"use client";

import { useState } from "react";
import { ClipboardCheck, FileText } from "lucide-react";

type Tab = "v1" | "v2";

export function KlasifikasiChipNav({
  initial,
  v1Count,
  v1Pending,
  v2Count,
  children,
}: {
  initial: Tab;
  v1Count: number;
  v1Pending: number;
  v2Count: number;
  children: Record<Tab, React.ReactNode>;
}) {
  const [active, setActive] = useState<Tab>(initial);

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2">
        <Chip
          active={active === "v1"}
          onClick={() => setActive("v1")}
          icon={ClipboardCheck}
          label="Assessment Klasifikasi Desa V1 (ADWI)"
          count={v1Count}
        />
        <Chip
          active={active === "v2"}
          onClick={() => setActive("v2")}
          icon={FileText}
          label="Assessment Klasifikasi Desa V2 (Atourin)"
          count={v2Count}
        />
      </nav>

      {active === "v1" && v1Pending > 0 && (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-atr-yellow/20 px-2.5 py-1 text-[11px] font-bold text-atr-fg">
          ⏳ {v1Pending} kriteria menunggu review di seluruh desa
        </p>
      )}
      {active === "v2" && v2Count > 0 && (
        <p className="text-[11px] text-atr-arti">
          ⚡ Approve akan otomatis promote klasifikasi desa
        </p>
      )}

      <div>{children[active]}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition ${
        active
          ? "border-atr-purple bg-atr-purple text-white shadow-atr-1"
          : "border-atr-outline bg-white text-atr-fg-muted hover:border-atr-purple/30 hover:text-atr-fg"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <span
        className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
          active
            ? "bg-white/25 text-white"
            : "bg-atr-bg-soft text-atr-fg-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
