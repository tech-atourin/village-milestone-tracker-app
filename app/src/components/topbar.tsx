import Link from "next/link";
import Image from "next/image";
import type { SessionUser } from "@/lib/auth/rbac";
import { NotificationBell } from "@/components/notification-bell";
import { countUnreadNotifications } from "@/server/queries/notifications";
import { UserMenu } from "@/components/user-menu";

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
  showBrand?: "auto" | "always" | "never";
}) {
  const renderBrand = !title && showBrand !== "never";
  const unreadCount = await countUnreadNotifications(user.id);

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
        <NotificationBell unreadCount={unreadCount} />
        {/* UserMenu disembunyikan di mobile - akses akun ada di drawer
            "Lainnya" pada bottom nav. */}
        <div className="hidden lg:block">
          <UserMenu
            variant="topbar-down"
            user={{
              full_name: user.full_name,
              email: user.email,
              role_label: ROLE_LABELS[user.global_role],
              avatar_url: user.avatar_url,
            }}
          />
        </div>
      </div>
    </header>
  );
}
