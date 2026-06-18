export const metadata = { title: "Laporan Project" };

import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { getProject } from "@/server/queries/projects";
import { ReportBody } from "./report-body";

export default async function FinalReportPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { ai?: string };
}) {
  await requireRole("superadmin");
  const project = await getProject(params.id);
  if (!project) notFound();
  return (
    <ReportBody
      projectId={params.id}
      aiOn={searchParams.ai === "1"}
      backHref={`/atourin/projects/${params.id}`}
    />
  );
}
