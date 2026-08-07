export const metadata = { title: "Sertifikat Desa" };

import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { getRaporDesaDetail } from "@/server/queries/rapor-desa";
import { listProjectLogoUrls } from "@/server/actions/project-logos";
import { SertifikatDesaView } from "./sertifikat-desa-view";

export default async function SertifikatDesaPage({
  params,
}: {
  params: { id: string; desaId: string };
}) {
  await requireRole("superadmin");
  const [data, extraLogos] = await Promise.all([
    getRaporDesaDetail(params.id, params.desaId),
    listProjectLogoUrls(params.id),
  ]);
  if (!data) notFound();
  return (
    <SertifikatDesaView
      data={data}
      extraLogos={extraLogos}
      backHref={`/atourin/projects/${params.id}/rapor-desa/${params.desaId}`}
    />
  );
}
