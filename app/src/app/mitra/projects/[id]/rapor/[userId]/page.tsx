export const metadata = { title: "Rapor Peserta" };

import { notFound } from "next/navigation";
import { getCurrentUser, requireRole } from "@/lib/auth/rbac";
import {
  loadRapor,
  RaporView,
} from "@/app/atourin/projects/[id]/rapor/[userId]/rapor-view";

export default async function MitraRaporPage({
  params,
}: {
  params: { id: string; userId: string };
}) {
  await requireRole("mitra_admin");
  const user = await getCurrentUser();
  const data = await loadRapor(params.id, params.userId);
  if (!data.project || !data.user || !user) notFound();

  // Ownership: mitra can only view rapor for projects under their own org.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (data.project as any).organization_id as string | null;
  if (orgId && orgId !== user.organization_id) notFound();

  return <RaporView data={data} />;
}
