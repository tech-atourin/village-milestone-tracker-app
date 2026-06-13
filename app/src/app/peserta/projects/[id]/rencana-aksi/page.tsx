export const metadata = { title: "Rencana Aksi" };

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { listActionPlans } from "@/server/queries/action-plans";
import { createClient } from "@/lib/supabase/server";
import { ActionPlanBoard } from "@/components/action-plans/action-plan-board";

async function loadPesertaDesaOptions(userId: string, projectDesaId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("project_desa")
    .select(
      "id, project_id, desa:desa(name), project:projects(name)",
    )
    .eq("id", projectDesaId)
    .maybeSingle();
  if (!data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any;
  return [
    {
      project_desa_id: r.id,
      project_id: r.project_id,
      project_name: r.project?.name ?? "—",
      desa_name: r.desa?.name ?? "—",
    },
  ];
}

export default async function PesertaRencanaAksiPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  // params.id is project_desa_id in peserta scope
  const [rows, desaOptions] = await Promise.all([
    listActionPlans({ projectDesaId: params.id }),
    loadPesertaDesaOptions(user.id, params.id),
  ]);
  return (
    <div className="space-y-6">
      <Link
        href={`/peserta/projects/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke project
      </Link>
      <header>
        <h1 className="text-xl font-bold tracking-tight text-atr-fg">
          Rencana Aksi Desa Kami
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Rencana tindak lanjut yang akan dijalankan desa setelah pendampingan.
        </p>
      </header>
      <ActionPlanBoard
        rows={rows}
        desaOptions={desaOptions}
        canEdit={true}
        showDesa={false}
      />
    </div>
  );
}
