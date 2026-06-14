import Link from "next/link";
import { Bell } from "lucide-react";

/**
 * Topbar bell — links to /notifications. Dropdown was removed in favor
 * of a dedicated page that gives notifications full room (filters,
 * group-by-day, mark-as-read). The badge shows the unread count.
 */
export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  return (
    <Link
      href="/notifications"
      className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-atr-outline bg-white text-atr-fg transition hover:bg-atr-bg-soft"
      aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ""}`}
      title={
        unreadCount > 0
          ? `${unreadCount} notifikasi belum dibaca`
          : "Notifikasi"
      }
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-atr-red px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
