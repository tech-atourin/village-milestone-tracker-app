export const metadata = { title: "Detail Desa" };

import { notFound } from "next/navigation";
import { getCurrentUser, requireRole } from "@/lib/auth/rbac";
import { ProjectDesaDetailView } from "@/app/atourin/projects/[id]/desa/[desaId]/desa-detail-view";
import { getProject } from "@/server/queries/projects";
import { getProjectDesa } from "@/server/queries/desa";

export default async function MitraDesaDetailPage({
  params,
}: {
  params: { id: string; desaId: string };
}) {
  await requireRole("mitra_admin");
  const user = await getCurrentUser();
  const project = await getProject(params.id);
  const detail = await getProjectDesa(params.id, params.desaId);
  if (!project || !user || !detail) notFound();
  if (
    project.organization?.id &&
    project.organization.id !== user.organization_id
  )
    notFound();
  return (
    <ProjectDesaDetailView
      projectId={params.id}
      projectDesaId={params.desaId}
      scope="mitra"
    />
  );
}
