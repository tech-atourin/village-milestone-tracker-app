export const metadata = { title: "Sertifikat Peserta" };

import { notFound } from "next/navigation";
import { getCurrentUser, requireRole } from "@/lib/auth/rbac";
import { loadRapor } from "@/app/atourin/projects/[id]/rapor/[userId]/rapor-view";
import { SertifikatView } from "@/app/atourin/projects/[id]/rapor/[userId]/sertifikat/sertifikat-view";

export default async function MitraSertifikatPage({
  params,
}: {
  params: { id: string; userId: string };
}) {
  await requireRole("mitra_admin");
  const user = await getCurrentUser();
  const data = await loadRapor(params.id, params.userId);
  if (!data.project || !data.user || !user) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (data.project as any).organization_id as string | null;
  if (orgId && orgId !== user.organization_id) notFound();
  return (
    <SertifikatView
      data={data}
      backHref={`/mitra/projects/${params.id}/rapor/${params.userId}`}
    />
  );
}
