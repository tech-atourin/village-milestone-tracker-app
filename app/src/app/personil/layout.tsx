import { Sidebar, type SidebarItem } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { requireRole } from "@/lib/auth/rbac";

const NAV_ITEMS: SidebarItem[] = [
  { href: "/personil/projects", label: "Project", icon: "Folder" },
  { href: "/personil/logbook", label: "Log Book", icon: "NotebookPen" },
];

export default async function PersonilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("personil");

  return (
    <div className="flex min-h-screen bg-atr-bg-soft">
      <Sidebar
        items={NAV_ITEMS}
        scopeLabel="Personil"
        user={{
          full_name: user.full_name,
          email: user.email,
          role_label: "Personil",
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
        scopeLabel="Personil"
        user={{
          full_name: user.full_name,
          email: user.email,
          role_label: "Personil",
          avatar_url: user.avatar_url,
        }}
      />
    </div>
  );
}
