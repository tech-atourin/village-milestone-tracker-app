export const metadata = { title: "Sertifikat Desa" };

import { notFound } from "next/navigation";
import { getCurrentUser, requireRole } from "@/lib/auth/rbac";
import { getProject } from "@/server/queries/projects";
import { getRaporDesaDetail } from "@/server/queries/rapor-desa";
import { SertifikatDesaView } from "@/app/atourin/projects/[id]/rapor-desa/[desaId]/sertifikat/sertifikat-desa-view";

export default async function MitraSertifikatDesaPage({
  params,
}: {
  params: { id: string; desaId: string };
}) {
  await requireRole("mitra_admin");
  const user = await getCurrentUser();
  const project = await getProject(params.id);
  if (!project || !user) notFound();
  if (
    project.organization?.id &&
    project.organization.id !== user.organization_id
  )
    notFound();

  const data = await getRaporDesaDetail(params.id, params.desaId);
  if (!data) notFound();

  return (
    <SertifikatDesaView
      data={data}
      backHref={`/mitra/projects/${params.id}/rapor-desa/${params.desaId}`}
    />
  );
}
