import { Sidebar, type SidebarItem } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { requireRole } from "@/lib/auth/rbac";

const ROLE_LABEL = "Superadmin Atourin";

const NAV_ITEMS: SidebarItem[] = [
  { href: "/atourin/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/atourin/projects", label: "Projects", icon: "Folder" },
  { href: "/atourin/desa", label: "Desa", icon: "MapPin" },
  { href: "/atourin/klasifikasi", label: "Klasifikasi", icon: "Award" },
  { href: "/atourin/insights", label: "AI Insights", icon: "Sparkles" },
  { href: "/atourin/templates", label: "Templates", icon: "LayoutTemplate" },
  { href: "/atourin/users", label: "Users", icon: "Users" },
  { href: "/atourin/orgs", label: "Organisasi", icon: "Building2" },
  { href: "/atourin/narasumber", label: "Narasumber", icon: "GraduationCap" },
  { href: "/atourin/audit", label: "Audit Log", icon: "ShieldCheck" },
];

export default async function AtourinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("superadmin");

  return (
    <div className="flex min-h-screen bg-atr-bg-soft">
      <Sidebar
        items={NAV_ITEMS}
        scopeLabel="Atourin"
        user={{
          full_name: user.full_name,
          email: user.email,
          role_label: ROLE_LABEL,
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
