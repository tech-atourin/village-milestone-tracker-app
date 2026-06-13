import { Sidebar, type SidebarItem } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { requireRole } from "@/lib/auth/rbac";

const NAV_ITEMS: SidebarItem[] = [
  { href: "/mitra/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/mitra/projects", label: "My Projects", icon: "Folder" },
  { href: "/mitra/reports", label: "Reports", icon: "BarChart3" },
  { href: "/mitra/peserta", label: "Peserta", icon: "Users" },
];

export default async function MitraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("mitra_admin");

  return (
    <div className="flex min-h-screen bg-atr-bg-soft">
      <Sidebar items={NAV_ITEMS} scopeLabel="Mitra" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
