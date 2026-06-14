export const metadata = { title: "Laporan Project" };

import { notFound } from "next/navigation";
import { requireRole, getCurrentUser } from "@/lib/auth/rbac";
import { getProject } from "@/server/queries/projects";
import { ReportBody } from "@/app/atourin/projects/[id]/report/report-body";

export default async function MitraFinalReportPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { ai?: string };
}) {
  await requireRole("mitra_admin");
  const user = await getCurrentUser();
  const project = await getProject(params.id);
  if (!project || !user) notFound();
  // Ownership: mitra can only access projects of their own organization
  if (
    project.organization?.id &&
    project.organization.id !== user.organization_id
  )
    notFound();
  return <ReportBody projectId={params.id} aiOn={searchParams.ai === "1"} />;
}
