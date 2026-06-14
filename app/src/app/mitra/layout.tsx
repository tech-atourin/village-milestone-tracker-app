import { Sidebar, type SidebarItem } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { requireRole } from "@/lib/auth/rbac";

const NAV_ITEMS: SidebarItem[] = [
  { href: "/mitra/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/mitra/projects", label: "Project Saya", icon: "Folder" },
  { href: "/mitra/desa", label: "Desa", icon: "MapPin" },
  { href: "/mitra/peserta", label: "Peserta", icon: "Users" },
  { href: "/mitra/narasumber", label: "Narasumber", icon: "GraduationCap" },
  { href: "/mitra/laporan", label: "Laporan", icon: "BarChart3" },
];

export default async function MitraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("mitra_admin");

  return (
    <div className="flex min-h-screen bg-atr-bg-soft">
      <Sidebar
        items={NAV_ITEMS}
        scopeLabel="Mitra"
        user={{
          full_name: user.full_name,
          email: user.email,
          role_label: "Mitra Admin",
          avatar_url: user.avatar_url,
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
