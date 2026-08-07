export const metadata = { title: "Sertifikat Peserta" };

import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { loadRapor } from "../rapor-view";
import { SertifikatView } from "./sertifikat-view";
import { listProjectLogoUrls } from "@/server/actions/project-logos";
import { getProject } from "@/server/queries/projects";

export default async function SertifikatPage({
  params,
}: {
  params: { id: string; userId: string };
}) {
  await requireRole("superadmin");
  const [data, extraLogos, project] = await Promise.all([
    loadRapor(params.id, params.userId),
    listProjectLogoUrls(params.id),
    getProject(params.id),
  ]);
  if (!data.project || !data.user) notFound();
  return (
    <SertifikatView
      data={data}
      extraLogos={extraLogos}
      gradingConfig={project?.grading_config}
      backHref={`/atourin/projects/${params.id}/rapor/${params.userId}`}
    />
  );
}
