import { Topbar } from "@/components/topbar";
import { requireRole } from "@/lib/auth/rbac";

export default async function PesertaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("peserta");

  return (
    <div className="min-h-screen bg-atr-bg-soft">
      <Topbar user={user} showBrand="always" />
      <main className="mx-auto max-w-md p-4 sm:max-w-2xl sm:p-6">
        {children}
      </main>
    </div>
  );
}
