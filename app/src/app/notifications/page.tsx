export const metadata = { title: "Notifikasi" };

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bell, Inbox } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import { listUserNotifications } from "@/server/queries/notifications";
import { NotificationsClient } from "./notifications-client";

const HOME_BY_ROLE: Record<string, string> = {
  superadmin: "/atourin/dashboard",
  mitra_admin: "/mitra/dashboard",
  narasumber: "/narasumber",
  peserta: "/peserta/home",
  desa_wisata: "/desa",
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Load up to 200. Bell still only loads 15.
  const items = await listUserNotifications(user.id, 200);

  // Enrich payload.project_desa_id for peserta when missing — legacy rows
  // and certain notify call sites don't include it, which breaks the
  // /peserta/projects/[project_desa_id] redirect.
  if (user.global_role === "peserta") {
    const missing = items.filter(
      (n) => n.payload?.project_id && !n.payload?.project_desa_id,
    );
    if (missing.length > 0) {
      const admin = createAdminClient();
      const projectIds = Array.from(
        new Set(
          missing
            .map((n) => n.payload!.project_id as string | undefined)
            .filter((x): x is string => !!x),
        ),
      );
      // Map: project_id → project_desa.id for THIS peserta's membership
      const { data: rows } = await admin
        .from("project_memberships")
        .select("project_id, desa_id")
        .eq("user_id", user.id)
        .eq("role", "peserta")
        .in("project_id", projectIds);
      const desaByProject = new Map<string, string>();
      for (const m of ((rows ?? []) as Array<{
        project_id: string;
        desa_id: string | null;
      }>)) {
        if (m.desa_id) desaByProject.set(m.project_id, m.desa_id);
      }
      // Resolve project_desa.id from (project_id, desa_id)
      const pairs = Array.from(desaByProject.entries());
      if (pairs.length > 0) {
        const orFilter = pairs
          .map(([p, d]) => `and(project_id.eq.${p},desa_id.eq.${d})`)
          .join(",");
        const { data: pd } = await admin
          .from("project_desa")
          .select("id, project_id, desa_id")
          .or(orFilter);
        const pdByProject = new Map<string, string>();
        for (const r of ((pd ?? []) as Array<{
          id: string;
          project_id: string;
          desa_id: string;
        }>)) {
          pdByProject.set(r.project_id, r.id);
        }
        for (const n of missing) {
          const pid = n.payload?.project_id as string | undefined;
          if (pid && pdByProject.has(pid)) {
            n.payload = { ...n.payload, project_desa_id: pdByProject.get(pid) };
          }
        }
      }
    }
  }

  const homeHref = HOME_BY_ROLE[user.global_role] ?? "/";

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <Link
        href={homeHref}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Link>
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-atr-purple-50 text-atr-purple-600">
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            Notifikasi
          </h1>
          <p className="text-sm text-atr-fg-muted">
            Semua aktivitas terkait Anda: review checklist, verifikasi
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
          <NotificationsClient items={items} userRole={user.global_role} />
        </div>
      )}
    </div>
  );
}
