"use client";

import { useState } from "react";
import { Bell, Inbox } from "lucide-react";
import type { NotificationRow } from "@/server/queries/notifications";

const ICON_FOR: Record<string, string> = {
  checklist_approved: "✓",
  checklist_rejected: "⚠",
  evidence_submitted: "📎",
  baseline_submitted: "📝",
  project_invitation: "✉",
};

export function NotificationBell({ items }: { items: NotificationRow[] }) {
  const [open, setOpen] = useState(false);
  const unread = items.length; // simplified — TODO: track read_at column

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-atr-outline bg-white text-atr-fg transition hover:bg-atr-bg-soft"
        aria-label="Notifikasi"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-atr-red px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-4">
            <div className="border-b border-atr-outline px-4 py-3">
              <h3 className="text-sm font-bold text-atr-fg">Notifikasi</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-8 text-center">
                  <Inbox className="mx-auto mb-2 h-6 w-6 text-atr-fg-muted" />
                  <p className="text-sm text-atr-fg-muted">
                    Belum ada notifikasi.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-atr-outline">
                  {items.map((n) => (
                    <li key={n.id} className="px-4 py-3 hover:bg-atr-bg-soft">
                      <div className="flex items-start gap-2">
                        <span className="text-lg leading-none text-atr-purple">
                          {ICON_FOR[n.template_key] ?? "•"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-atr-fg">
                            {n.payload._rendered?.inAppText ?? n.template_key}
                          </p>
                          <p className="mt-0.5 text-[11px] text-atr-fg-muted">
                            {new Intl.DateTimeFormat("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(n.created_at))}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
