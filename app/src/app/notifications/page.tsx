export const metadata = { title: "Notifikasi" };

import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell, Inbox, ArrowLeft } from "lucide-react";
import { getCurrentUser, scopeHomePath } from "@/lib/auth/rbac";
import { listUserNotifications } from "@/server/queries/notifications";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Load up to 200 — full history for the page (bell still only loads 15)
  const items = await listUserNotifications(user.id, 200);
  const homePath = scopeHomePath(user.global_role);

  return (
    <div className="min-h-screen bg-atr-bg-soft">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <Link
          href={homePath}
          className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke dashboard
        </Link>
        <header className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-atr-purple-50 text-atr-purple-600">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
              Notifikasi
            </h1>
            <p className="text-sm text-atr-fg-muted">
              Semua aktivitas terkait Anda — review checklist, verifikasi
              klasifikasi, komentar, dan undangan project.
            </p>
          </div>
        </header>

        {items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
            <Inbox className="mx-auto mb-3 h-7 w-7 text-atr-fg-muted" />
            <p className="text-sm font-bold text-atr-fg">
              Belum ada notifikasi
            </p>
            <p className="mt-1 text-xs text-atr-fg-muted">
              Notifikasi akan muncul di sini ketika ada aktivitas yang relevan.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <NotificationsClient items={items} />
          </div>
        )}
      </div>
    </div>
  );
}
