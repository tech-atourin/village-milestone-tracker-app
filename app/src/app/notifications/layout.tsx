import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { getCurrentUser } from "@/lib/auth/rbac";
import { SCOPE_NAV, type ScopeRole } from "@/lib/nav/scope-nav";

export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const scope = SCOPE_NAV[user.global_role as ScopeRole];

  // Peserta uses a topbar-only mobile shell - no sidebar.
  if (user.global_role === "peserta") {
    return (
      <div className="min-h-screen bg-atr-bg-soft">
        <Topbar user={user} showBrand="always" />
        <main className="mx-auto max-w-md p-4 sm:max-w-2xl sm:p-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-atr-bg-soft">
      <Sidebar
        items={scope.items}
        scopeLabel={scope.label}
        user={{
          full_name: user.full_name,
          email: user.email,
          role_label: scope.roleLabel,
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
