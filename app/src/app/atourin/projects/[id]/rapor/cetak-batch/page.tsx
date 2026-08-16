export const metadata = { title: "Cetak Rapor per Gelombang" };

import { requireRole } from "@/lib/auth/rbac";
import { listProjectRapor } from "@/server/queries/rapor";
import { getProject } from "@/server/queries/projects";
import { RaporCetakBatch } from "../rapor-cetak-batch";

export default async function CetakBatchPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("superadmin");
  const [rows, project] = await Promise.all([
    listProjectRapor(params.id),
    getProject(params.id),
  ]);

  return (
    <div className="space-y-6">
      <RaporCetakBatch
        projectId={params.id}
        projectName={project?.name ?? "Program"}
        rows={rows}
        gradingConfig={project?.grading_config}
      />
    </div>
  );
}
