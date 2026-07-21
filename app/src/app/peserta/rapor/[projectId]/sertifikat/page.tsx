export const metadata = { title: "Sertifikat Saya" };

import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import { loadRapor } from "@/app/atourin/projects/[id]/rapor/[userId]/rapor-view";
import { SertifikatView } from "@/app/atourin/projects/[id]/rapor/[userId]/sertifikat/sertifikat-view";
import { listProjectLogoUrls } from "@/server/actions/project-logos";

/** Sertifikat milik peserta yang sedang login (hanya untuk dirinya sendiri). */
export default async function PesertaSertifikatPage({
  params,
}: {
  params: { projectId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("project_memberships")
    .select("id")
    .eq("project_id", params.projectId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);
  if (!member || member.length === 0) notFound();

  const [data, extraLogos] = await Promise.all([
    loadRapor(params.projectId, user.id),
    listProjectLogoUrls(params.projectId),
  ]);
  if (!data.project || !data.user) notFound();

  return (
    <SertifikatView
      data={data}
      extraLogos={extraLogos}
      backHref={`/peserta/rapor/${params.projectId}`}
    />
  );
}
