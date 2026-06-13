export const metadata = { title: "Detail Rapor Desa" };

import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { getRaporDesaDetail } from "@/server/queries/rapor-desa";
import { RaporDesaPrintable } from "@/components/rapor/rapor-desa-printable";

export default async function RaporDesaDetailPage({
  params,
}: {
  params: { id: string; desaId: string };
}) {
  await requireRole("superadmin");
  const data = await getRaporDesaDetail(params.id, params.desaId);
  if (!data) notFound();

  return <RaporDesaPrintable data={data} backHref={`/atourin/projects/${params.id}/rapor-desa`} />;
}
