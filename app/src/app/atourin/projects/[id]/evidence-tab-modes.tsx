"use client";

import { useState } from "react";
import { FolderTree, ClipboardCheck } from "lucide-react";

type Mode = "queue" | "directory";

export function EvidenceTabModes({
  queueLabel,
  directoryLabel,
  queue,
  directory,
}: {
  queueLabel: string;
  directoryLabel: string;
  queue: React.ReactNode;
  directory: React.ReactNode;
}) {
  const [mode, setMode] = useState<Mode>("directory");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav
          className="inline-flex rounded-lg border border-atr-outline bg-white p-0.5 text-xs"
          role="tablist"
        >
          <ModeChip
            label={directoryLabel}
            icon={FolderTree}
            active={mode === "directory"}
            onClick={() => setMode("directory")}
          />
          <ModeChip
            label={queueLabel}
            icon={ClipboardCheck}
            active={mode === "queue"}
            onClick={() => setMode("queue")}
          />
        </nav>
        <p className="text-[11px] text-atr-fg-muted">
          Review per-item kini ada di{" "}
          <strong className="text-atr-fg">Detail Desa per Topik</strong>.
        </p>
      </div>
      {mode === "directory" ? directory : queue}
    </div>
  );
}

function ModeChip({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition ${
        active
          ? "bg-atr-purple text-white"
          : "text-atr-fg-muted hover:text-atr-fg"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
