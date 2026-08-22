export const metadata = { title: "Rapor Peserta" };

import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/rbac";
import { isPersonnelOnProject } from "@/server/queries/personnel";
import { loadRapor, RaporView } from "@/app/atourin/projects/[id]/rapor/[userId]/rapor-view";

export default async function PersonilRaporPage({
  params,
}: {
  params: { id: string; userId: string };
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.global_role !== "personil") redirect("/forbidden");
  if (!(await isPersonnelOnProject(params.id))) notFound();

  const data = await loadRapor(params.id, params.userId);
  if (!data.project || !data.user) notFound();
  return (
    <RaporView
      data={data}
      scope="personil"
      backHref={`/personil/projects/${params.id}?tab=peserta`}
    />
  );
}
