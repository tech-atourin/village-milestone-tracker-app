export const metadata = { title: "Detail Rapor Desa" };

import { notFound } from "next/navigation";
import { getCurrentUser, requireRole } from "@/lib/auth/rbac";
import { getProject } from "@/server/queries/projects";
import { getRaporDesaDetail } from "@/server/queries/rapor-desa";
import { RaporDesaPrintable } from "@/components/rapor/rapor-desa-printable";

export default async function MitraRaporDesaDetailPage({
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
    <RaporDesaPrintable
      data={data}
      backHref={`/mitra/projects/${params.id}/rapor-desa`}
      sertifikatHref={`/mitra/projects/${params.id}/rapor-desa/${params.desaId}/sertifikat`}
    />
  );
}
