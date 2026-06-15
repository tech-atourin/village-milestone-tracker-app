export const metadata = { title: "Detail Narasumber" };

import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { getNarasumberDetail } from "@/server/queries/narasumber";
import { NarasumberDetailView } from "@/app/atourin/narasumber/[id]/narasumber-detail-view";

export default async function MitraNarasumberDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("mitra_admin");
  const data = await getNarasumberDetail(params.id);
  if (!data) notFound();
  return <NarasumberDetailView data={data} backHref="/mitra/narasumber" />;
}
