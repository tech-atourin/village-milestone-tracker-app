"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, X } from "lucide-react";

export type DateRangeValue = {
  from: string | null;
  to: string | null;
};

function fmt(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Single trigger that opens a popover with from/to native date inputs.
 * Used everywhere a date range is filtered or selected, so the widget
 * looks the same across roles (DataTable filters, audit log, etc).
 */
export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pilih rentang tanggal",
  min,
  max,
  className,
  align = "start",
}: {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  className?: string;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hasValue = Boolean(value.from || value.to);
  const label = hasValue
    ? `${fmt(value.from) || "…"} – ${fmt(value.to) || "…"}`
    : placeholder;

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-10 items-center gap-2 rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15 ${
          hasValue
            ? "border-atr-purple/50 text-atr-fg"
            : "border-atr-outline text-atr-fg-muted"
        }`}
      >
        <Calendar
          className={`h-4 w-4 ${hasValue ? "text-atr-purple" : "text-atr-fg-muted"}`}
        />
        <span className="truncate">{label}</span>
        {hasValue && (
          <span
            role="button"
            aria-label="Bersihkan tanggal"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange({ from: null, to: null });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange({ from: null, to: null });
              }
            }}
            className="ml-1 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-atr-fg-muted transition hover:bg-atr-bg-soft hover:text-atr-fg"
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>
      {open && (
        <div
          className={`absolute top-full z-50 mt-1 w-64 rounded-xl border border-atr-outline bg-white p-3 shadow-atr-3 ${
            align === "end" ? "right-0" : "left-0"
          }`}
        >
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-atr-fg-muted">
              Dari
            </span>
            <input
              type="date"
              value={value.from ?? ""}
              min={min}
              max={value.to ?? max}
              onChange={(e) =>
                onChange({ from: e.target.value || null, to: value.to })
              }
              className="mt-1 h-9 w-full rounded-lg border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </label>
          <label className="mt-2 block">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-atr-fg-muted">
              Sampai
            </span>
            <input
              type="date"
              value={value.to ?? ""}
              min={value.from ?? min}
              max={max}
              onChange={(e) =>
                onChange({ from: value.from, to: e.target.value || null })
              }
              className="mt-1 h-9 w-full rounded-lg border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </label>
          <div className="mt-3 flex justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onChange({ from: null, to: null });
                setOpen(false);
              }}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-outline bg-white px-2.5 text-xs font-bold text-atr-fg-muted transition hover:bg-atr-bg-soft"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 items-center rounded-md bg-atr-purple px-3 text-xs font-bold text-white transition hover:bg-atr-purple-600"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
