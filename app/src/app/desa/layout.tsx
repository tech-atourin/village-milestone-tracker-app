import { LayoutDashboard, ClipboardCheck, MapPin } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { requireRole } from "@/lib/auth/rbac";

const NAV_ITEMS = [
  { href: "/desa/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/desa/self-assessment", label: "Self-Assessment", icon: ClipboardCheck },
  { href: "/desa/profil", label: "Profil Desa", icon: MapPin },
];

export default async function DesaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("desa_wisata");

  return (
    <div className="flex min-h-screen bg-atr-bg-soft">
      <Sidebar items={NAV_ITEMS} scopeLabel="Desa Wisata" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
