export const metadata = { title: "Detail Rapor Desa" };

import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/rbac";
import { getRepresentingDesa } from "@/server/queries/self-assessment";
import { getRaporDesaDetail } from "@/server/queries/rapor-desa";
import { RaporDesaPrintable } from "@/components/rapor/rapor-desa-printable";

export default async function DesaRiwayatDetailPage({
  params,
}: {
  params: { projectId: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const desa = await getRepresentingDesa(user.id);
  if (!desa) notFound();

  const data = await getRaporDesaDetail(params.projectId, desa.desa_id);
  if (!data) notFound();

  return (
    <RaporDesaPrintable
      data={data}
      backHref="/desa/riwayat"
    />
  );
}
