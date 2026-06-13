import Link from "next/link";
import Image from "next/image";
import { LogOut, User } from "lucide-react";
import { signOutAction } from "@/app/login/actions";
import type { SessionUser } from "@/lib/auth/rbac";
import { NotificationBell } from "@/components/notification-bell";
import { listUserNotifications } from "@/server/queries/notifications";

const ROLE_LABELS: Record<SessionUser["global_role"], string> = {
  superadmin: "Superadmin Atourin",
  mitra_admin: "Mitra Admin",
  peserta: "Peserta",
  narasumber: "Narasumber",
  desa_wisata: "Pengelola Desa Wisata",
};

export async function Topbar({
  user,
  title,
  showBrand = "auto",
}: {
  user: SessionUser;
  title?: string;
  /**
   * "auto" (default): show brand on the left only when there's no title AND
   * we're on a small viewport (sidebar collapsed) or peserta scope.
   * "always" / "never" override.
   */
  showBrand?: "auto" | "always" | "never";
}) {
  const renderBrand = !title && showBrand !== "never";
  const notifications = await listUserNotifications(user.id, 15);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-atr-outline bg-white px-4 sm:px-6">
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-base font-bold tracking-tight text-atr-fg">
            {title}
          </h1>
        )}
        {renderBrand && (
          <Link
            href="/"
            className={`flex items-center gap-2.5 ${
              showBrand === "always" ? "" : "lg:hidden"
            }`}
            aria-label="Village Milestone Tracker"
          >
            <Image
              src="/logo/vmt/vmt-app-icon.svg"
              alt=""
              width={36}
              height={36}
              className="rounded-md shadow-atr-1"
            />
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight text-atr-fg">
                Village Milestone Tracker
              </div>
              <div className="text-[11px] text-atr-fg-muted">by Atourin</div>
            </div>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell items={notifications} />
        <div className="hidden text-right sm:block">
          <div className="text-sm font-bold text-atr-fg">
            {user.full_name}
          </div>
          <div className="text-xs text-atr-fg-muted">
            {ROLE_LABELS[user.global_role]}
          </div>
        </div>
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-atr-purple-50 text-atr-purple transition hover:bg-atr-purple-light/40"
          aria-label="Profil"
        >
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <User className="h-4 w-4" />
          )}
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
            aria-label="Keluar"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </button>
        </form>
      </div>
    </header>
  );
}
