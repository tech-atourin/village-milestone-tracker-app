export const metadata = { title: "Rencana Aksi Project" };

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { listActionPlans } from "@/server/queries/action-plans";
import { ActionPlanBoard } from "@/components/action-plans/action-plan-board";

export default async function MitraProjectRencanaAksiPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("mitra_admin");
  const rows = await listActionPlans({ projectId: params.id });
  return (
    <div className="space-y-6">
      <Link
        href={`/mitra/projects/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke project
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Rencana Aksi
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Daftar rencana aksi dari peserta & narasumber di project ini.
        </p>
      </header>
      <ActionPlanBoard rows={rows} desaOptions={[]} canEdit={false} />
    </div>
  );
}
