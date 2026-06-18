export const metadata = { title: "Detail Desa" };

import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { ProjectDesaDetailView } from "./desa-detail-view";
import { getProjectDesa } from "@/server/queries/desa";

export default async function AtourinDesaDetailPage({
  params,
  searchParams,
}: {
  params: { id: string; desaId: string };
  searchParams: { from?: string };
}) {
  await requireRole("superadmin");
  const detail = await getProjectDesa(params.id, params.desaId);
  if (!detail) notFound();
  return (
    <ProjectDesaDetailView
      projectId={params.id}
      projectDesaId={params.desaId}
      scope="atourin"
      backFrom={searchParams.from}
    />
  );
}
