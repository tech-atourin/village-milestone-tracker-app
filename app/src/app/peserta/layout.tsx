import { Topbar } from "@/components/topbar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import type { SidebarItem } from "@/components/sidebar";
import { requireRole } from "@/lib/auth/rbac";

const NAV_ITEMS: SidebarItem[] = [
  { href: "/peserta/home", label: "Beranda", icon: "LayoutDashboard" },
  { href: "/peserta/projects", label: "Project", icon: "Folder" },
  { href: "/notifications", label: "Notifikasi", icon: "ClipboardCheck" },
  { href: "/peserta/bantuan", label: "Bantuan", icon: "HelpCircle" },
  { href: "/profile", label: "Profil", icon: "Users" },
];

export default async function PesertaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("peserta");

  return (
    <div className="min-h-screen bg-atr-bg-soft">
      <Topbar user={user} showBrand="always" />
      <main className="mx-auto max-w-md p-4 pb-24 sm:max-w-2xl sm:p-6">
        {children}
      </main>
      <MobileBottomNav
        items={NAV_ITEMS}
        scopeLabel="Peserta"
        user={{
          full_name: user.full_name,
          email: user.email,
          role_label: "Peserta",
          avatar_url: user.avatar_url,
        }}
      />
    </div>
  );
}
