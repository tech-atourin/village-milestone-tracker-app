export const metadata = { title: "Detail Rapor Desa" };

import { notFound } from "next/navigation";
import { getCurrentUser, requireRole } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import { getRaporDesaDetail } from "@/server/queries/rapor-desa";
import { RaporDesaPrintable } from "@/components/rapor/rapor-desa-printable";

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

export default async function NarasumberRaporDesaDetailPage({
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
    <RaporDesaPrintable
      data={data}
      backHref={`/narasumber/projects/${params.id}/rapor-desa`}
      sertifikatHref={`/narasumber/projects/${params.id}/rapor-desa/${params.desaId}/sertifikat`}
    />
  );
}
