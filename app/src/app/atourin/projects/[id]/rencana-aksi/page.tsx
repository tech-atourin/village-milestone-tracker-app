export const metadata = { title: "Rencana Aksi Project" };

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { listActionPlans } from "@/server/queries/action-plans";
import { createClient } from "@/lib/supabase/server";
import { ActionPlanBoard } from "@/components/action-plans/action-plan-board";

async function loadDesaOptions(projectId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("project_desa")
    .select(
      "id, project_id, desa:desa(name), project:projects(name)",
    )
    .eq("project_id", projectId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    project_desa_id: r.id,
    project_id: r.project_id,
    project_name: r.project?.name ?? "—",
    desa_name: r.desa?.name ?? "—",
  }));
}

export default async function AtourinProjectRencanaAksiPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("superadmin");
  const [rows, desaOptions] = await Promise.all([
    listActionPlans({ projectId: params.id }),
    loadDesaOptions(params.id),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href={`/atourin/projects/${params.id}`}
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
          Admin Atourin bisa edit/tambah jika diperlukan.
        </p>
      </header>
      <ActionPlanBoard rows={rows} desaOptions={desaOptions} canEdit={true} />
    </div>
  );
}
