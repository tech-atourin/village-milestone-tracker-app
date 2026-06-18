export const metadata = { title: "Sertifikat Peserta" };

import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { loadRapor } from "../rapor-view";
import { SertifikatView } from "./sertifikat-view";

export default async function SertifikatPage({
  params,
}: {
  params: { id: string; userId: string };
}) {
  await requireRole("superadmin");
  const data = await loadRapor(params.id, params.userId);
  if (!data.project || !data.user) notFound();
  return (
    <SertifikatView
      data={data}
      backHref={`/atourin/projects/${params.id}/rapor/${params.userId}`}
    />
  );
}
