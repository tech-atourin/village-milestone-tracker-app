export const metadata = { title: "Rencana Aksi" };

import { getCurrentUser } from "@/lib/auth/rbac";
import { listActionPlans } from "@/server/queries/action-plans";
import { listNarasumberProjects } from "@/server/queries/pendampingan";
import { ActionPlanBoard } from "@/components/action-plans/action-plan-board";

export default async function NarasumberRencanaAksiPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const projects = await listNarasumberProjects(user.id);
  const allDesa = projects.flatMap((p) =>
    p.desa.map((d) => ({
      project_desa_id: d.project_desa_id,
      project_id: p.id,
      project_name: p.name,
      desa_name: d.desa_name,
    })),
  );

  // Get plans across all narasumber's projects, scoped to their desa
  const allowedProjectDesaIds = new Set(allDesa.map((d) => d.project_desa_id));
  const allPlans = await Promise.all(
    projects.map((p) => listActionPlans({ projectId: p.id })),
  );
  const rows = allPlans
    .flat()
    .filter((r) => r.project_desa_id != null && allowedProjectDesaIds.has(r.project_desa_id));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Rencana Aksi
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Rencana aksi yang akan dijalankan oleh peserta/desa setelah
          pendampingan. Anda bisa menambah, mengedit, dan memantau status.
        </p>
      </header>
      <ActionPlanBoard rows={rows} desaOptions={allDesa} canEdit={true} />
    </div>
  );
}
