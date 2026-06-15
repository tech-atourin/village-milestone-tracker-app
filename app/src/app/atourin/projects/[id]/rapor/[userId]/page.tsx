export const metadata = { title: "Rapor Peserta" };

import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { loadRapor, RaporView } from "./rapor-view";

export default async function RaporPage({
  params,
}: {
  params: { id: string; userId: string };
}) {
  await requireRole("superadmin");
  const data = await loadRapor(params.id, params.userId);
  if (!data.project || !data.user) notFound();
  return <RaporView data={data} />;
}
