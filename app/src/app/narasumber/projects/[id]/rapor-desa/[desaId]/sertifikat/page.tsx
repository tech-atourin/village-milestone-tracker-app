export const metadata = { title: "Sertifikat Desa" };

import { notFound } from "next/navigation";
import { getCurrentUser, requireRole } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import { getRaporDesaDetail } from "@/server/queries/rapor-desa";
import { SertifikatDesaView } from "@/app/atourin/projects/[id]/rapor-desa/[desaId]/sertifikat/sertifikat-desa-view";

async function isAssigned(projectId: string, userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("project_memberships")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("role", "narasumber")
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}

export default async function NarasumberSertifikatDesaPage({
  params,
}: {
  params: { id: string; desaId: string };
}) {
  await requireRole("narasumber");
  const user = await getCurrentUser();
  if (!user) notFound();
  if (!(await isAssigned(params.id, user.id))) notFound();

  const data = await getRaporDesaDetail(params.id, params.desaId);
  if (!data) notFound();

  return (
    <SertifikatDesaView
      data={data}
      backHref={`/narasumber/projects/${params.id}/rapor-desa/${params.desaId}`}
    />
  );
}
