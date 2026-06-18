export const metadata = { title: "Rapor Peserta" };

import { notFound } from "next/navigation";
import { getCurrentUser, requireRole } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import {
  loadRapor,
  RaporView,
} from "@/app/atourin/projects/[id]/rapor/[userId]/rapor-view";

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

export default async function NarasumberRaporPage({
  params,
}: {
  params: { id: string; userId: string };
}) {
  await requireRole("narasumber");
  const user = await getCurrentUser();
  if (!user) notFound();
  if (!(await isAssigned(params.id, user.id))) notFound();

  const data = await loadRapor(params.id, params.userId);
  if (!data.project || !data.user) notFound();
  return <RaporView data={data} scope="narasumber" />;
}
