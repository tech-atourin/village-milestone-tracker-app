export const metadata = { title: "Laporan Project" };

import { notFound } from "next/navigation";
import { getCurrentUser, requireRole } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import { getProject } from "@/server/queries/projects";
import { ReportBody } from "@/app/atourin/projects/[id]/report/report-body";

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

export default async function NarasumberFinalReportPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { ai?: string };
}) {
  await requireRole("narasumber");
  const user = await getCurrentUser();
  const project = await getProject(params.id);
  if (!project || !user) notFound();
  if (!(await isAssigned(params.id, user.id))) notFound();
  return (
    <ReportBody
      projectId={params.id}
      aiOn={searchParams.ai === "1"}
      backHref={`/narasumber/projects`}
    />
  );
}
