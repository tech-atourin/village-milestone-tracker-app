import { Sidebar, type SidebarItem } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { requireRole } from "@/lib/auth/rbac";

const NAV_ITEMS: SidebarItem[] = [
  { href: "/narasumber/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/narasumber/sesi", label: "Sesi Pendampingan", icon: "CalendarDays" },
  { href: "/narasumber/projects", label: "Project Saya", icon: "Folder" },
  { href: "/narasumber/rencana-aksi", label: "Rencana Aksi", icon: "ListChecks" },
];

export default async function NarasumberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("narasumber");

  return (
    <div className="flex min-h-screen bg-atr-bg-soft">
      <Sidebar
        items={NAV_ITEMS}
        scopeLabel="Narasumber"
        user={{
          full_name: user.full_name,
          email: user.email,
          role_label: "Narasumber",
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
        scopeLabel="Narasumber"
        user={{
          full_name: user.full_name,
          email: user.email,
          role_label: "Narasumber",
          avatar_url: user.avatar_url,
        }}
      />
    </div>
  );
}
