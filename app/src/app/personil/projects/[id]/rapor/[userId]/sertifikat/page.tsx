export const metadata = { title: "Sertifikat Peserta" };

import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/rbac";
import { isPersonnelOnProject } from "@/server/queries/personnel";
import { loadRapor } from "@/app/atourin/projects/[id]/rapor/[userId]/rapor-view";
import { SertifikatView } from "@/app/atourin/projects/[id]/rapor/[userId]/sertifikat/sertifikat-view";
import { listProjectLogoUrls } from "@/server/actions/project-logos";
import { getProject } from "@/server/queries/projects";

export default async function PersonilSertifikatPage({
  params,
}: {
  params: { id: string; userId: string };
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.global_role !== "personil") redirect("/forbidden");
  if (!(await isPersonnelOnProject(params.id))) notFound();

  const [data, extraLogos, project] = await Promise.all([
    loadRapor(params.id, params.userId),
    listProjectLogoUrls(params.id),
    getProject(params.id, { asAdmin: true }),
  ]);
  if (!data.project || !data.user) notFound();
  return (
    <SertifikatView
      data={data}
      extraLogos={extraLogos}
      gradingConfig={project?.grading_config}
      backHref={`/personil/projects/${params.id}/rapor/${params.userId}`}
    />
  );
}
