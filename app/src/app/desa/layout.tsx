import { Sidebar, type SidebarItem } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { requireRole } from "@/lib/auth/rbac";

const NAV_ITEMS: SidebarItem[] = [
  { href: "/desa/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/desa/self-assessment", label: "Self-Assessment", icon: "ClipboardCheck" },
  { href: "/desa/rencana-aksi", label: "Rencana Aksi", icon: "ListChecks" },
  { href: "/desa/kuis", label: "Hasil Kuis", icon: "ClipboardList" },
  { href: "/desa/riwayat", label: "Riwayat Program", icon: "History" },
  { href: "/desa/profil", label: "Profil Desa", icon: "MapPin" },
  { href: "/desa/pengelola", label: "Profil Pengelola", icon: "Building2" },
];

export default async function DesaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("desa_wisata");

  return (
    <div className="flex min-h-screen bg-atr-bg-soft">
      <Sidebar
        items={NAV_ITEMS}
        scopeLabel="Desa Wisata"
        user={{
          full_name: user.full_name,
          email: user.email,
          role_label: "Pengelola Desa Wisata",
          avatar_url: user.avatar_url,
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>
      <MobileBottomNav
        items={NAV_ITEMS}
        scopeLabel="Desa Wisata"
        user={{
          full_name: user.full_name,
          email: user.email,
          role_label: "Pengelola Desa Wisata",
          avatar_url: user.avatar_url,
        }}
      />
    </div>
  );
}
